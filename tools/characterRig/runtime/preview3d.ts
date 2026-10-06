import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { matrix } from '../domain/transform';
import { evaluateRig } from '../domain/animator';
import { bonePose, thickness } from '../domain/preview3d';
import type { CharacterRigData, DirectionId, Mode, Part, ViewId } from '../domain/rig';
import type { RigAssets } from './assets';

type Entry = { bone: THREE.Bone; mesh?: THREE.Group; part: Part; depth: number };
export class Preview3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
  private root = new THREE.Group();
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private entries = new Map<string, Entry>();
  private rig?: CharacterRigData;
  private direction: DirectionId = 'Front';
  private solo: string | null = null;
  private disposed = false;
  private active = false;
  private resources: { dispose(): void }[] = [];
  private recorder?: MediaRecorder;
  private recordingTimer?: ReturnType<typeof setTimeout>;
  private grid: THREE.GridHelper;
  private skeleton?: THREE.Skeleton;
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.domElement.setAttribute('aria-label', '3D 뼈대 캐릭터 미리보기');
    this.renderer.domElement.dataset.preview = '3d';
    const gl = this.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.renderer.domElement.dataset.gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unavailable';
    host.append(this.renderer.domElement);
    this.scene.add(this.root, new THREE.HemisphereLight(0xffffff, 0x526270, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(500, 1400, 1500); this.scene.add(light);
    this.grid = new THREE.GridHelper(1800, 12, 0x7bcdb6, 0x33464d); this.scene.add(this.grid);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 550, 0); this.controls.minDistance = 700; this.controls.maxDistance = 6000;
    this.cameraView('Front');
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.setActive(false);
  }
  private contextLost = (event: Event) => { event.preventDefault(); this.host.dataset.context = 'lost'; };
  private resize() {
    if (this.disposed) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  setActive(active: boolean) { this.active = active; this.renderer.domElement.hidden = !active; this.controls.enabled = active; this.resize(); }
  cameraView(view: string) {
    const offset = view === 'Back' ? [0, 150, -2400] : view === 'Side' ? [2400, 150, 0] : view === 'Isometric' ? [1800, 1000, 1800] : [0, 150, 2400];
    this.camera.position.set(offset[0], 550 + offset[1], offset[2]); this.controls.update();
  }
  clear() { this.root.clear(); this.entries.clear(); this.skeleton?.dispose(); this.skeleton = undefined; for (const resource of this.resources) resource.dispose(); this.resources = []; }
  private crop(assets: RigAssets, rig: CharacterRigData, viewId: ViewId, part: Part) {
    const view = rig.views[viewId], asset = assets.get(part.replacement?.id ?? view.image?.id);
    if (!asset) return;
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(part.rect.width); canvas.height = Math.ceil(part.rect.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const r = part.replacement ? { x: 0, y: 0, width: asset.ref.width, height: asset.ref.height } : part.rect;
    ctx.drawImage(asset.image, r.x, r.y, r.width, r.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  private releaseMeshes() {
    for (const entry of this.entries.values()) { entry.mesh?.removeFromParent(); entry.mesh=undefined; }
    for (const resource of this.resources) resource.dispose(); this.resources=[];
  }
  private standeeImages(front: HTMLCanvasElement, back: HTMLCanvasElement | undefined, part: Part, opposite: Part, normalization: number) {
    const sx=Math.abs(opposite.restTransform.scaleX/part.restTransform.scaleX)*normalization;
    const sy=Math.abs(opposite.restTransform.scaleY/part.restTransform.scaleY)*normalization;
    // Both source pivots coincide. Rear image X is mirrored into anatomical front coordinates.
    const rearLeft=part.pivot.x-(opposite.rect.width-opposite.pivot.x)*sx;
    const rearRight=part.pivot.x+opposite.pivot.x*sx;
    const rearTop=part.pivot.y-opposite.pivot.y*sy;
    const rearBottom=rearTop+opposite.rect.height*sy;
    const left=Math.floor(Math.min(0,back?rearLeft:0)), top=Math.floor(Math.min(0,back?rearTop:0));
    const width=Math.ceil(Math.max(front.width,back?rearRight:front.width)-left);
    const height=Math.ceil(Math.max(front.height,back?rearBottom:front.height)-top);
    if(width>8192||height>8192) throw new Error('앞뒤 파츠 정렬 크기가 너무 큽니다. 배율을 줄여 주세요.');
    const make=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
    const a=make(), b=make(), mask=make(); a.getContext('2d')!.drawImage(front,-left,-top);
    const ctx=b.getContext('2d')!;
    if(back) { ctx.translate(rearRight-left,rearTop-top);ctx.scale(-sx,sy);ctx.drawImage(back,0,0,opposite.rect.width,opposite.rect.height); }
    else ctx.drawImage(a,0,0);
    mask.getContext('2d')!.drawImage(a,0,0);mask.getContext('2d')!.drawImage(b,0,0);
    return {front:a,back:b,mask,pivot:{x:part.pivot.x-left,y:part.pivot.y-top}};
  }
  private maskShapes(mask: HTMLCanvasElement, pivot: {x:number;y:number}) {
    const step=Math.max(1,Math.max(mask.width,mask.height)/180);
    const width=Math.ceil(mask.width/step), height=Math.ceil(mask.height/step);
    const data=mask.getContext('2d')!.getImageData(0,0,mask.width,mask.height).data;
    const filled=(x:number,y:number)=>{
      if(x<0||y<0||x>=width||y>=height)return false;
      const px=Math.min(mask.width-1,Math.floor((x+.5)*step)),py=Math.min(mask.height-1,Math.floor((y+.5)*step));
      return data[(py*mask.width+px)*4+3]>100;
    };
    const edges=new Map<string,[number,number][]>();
    const add=(x:number,y:number,ex:number,ey:number)=>{const key=`${x},${y}`;const ends=edges.get(key)??[];ends.push([ex,ey]);edges.set(key,ends);};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
      if(!filled(x,y-1))add(x,y,x+1,y);if(!filled(x+1,y))add(x+1,y,x+1,y+1);
      if(!filled(x,y+1))add(x+1,y+1,x,y+1);if(!filled(x-1,y))add(x,y+1,x,y);
    }
    const loops:{points:THREE.Vector2[];area:number}[]=[];
    while(edges.size){
      const first=edges.keys().next().value as string, points:THREE.Vector2[]=[];
      let key=first,area=0,closed=false;
      for(let guard=0;guard<width*height*4;guard++){
        const [x,y]=key.split(',').map(Number),ends=edges.get(key);if(!ends?.length)break;
        const [ex,ey]=ends.pop()!;if(!ends.length)edges.delete(key);
        points.push(new THREE.Vector2(x*step-pivot.x,pivot.y-y*step));area+=x*ey-ex*y;
        key=`${ex},${ey}`;if(key===first){closed=true;break;}
      }
      if(closed&&Math.abs(area)>4)loops.push({points,area});
    }
    const outer=loops.filter(l=>l.area>0).map(l=>new THREE.Shape(l.points));
    const inside=(point:THREE.Vector2,poly:THREE.Vector2[])=>{
      let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[i],b=poly[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result;
      }return result;
    };
    for(const hole of loops.filter(l=>l.area<0)){
      const owner=outer.find(shape=>inside(hole.points[0],shape.getPoints()));if(owner)owner.holes.push(new THREE.Path(hole.points));
    }
    return outer;
  }
  sync(rig: CharacterRigData, assets: RigAssets, direction: DirectionId, solo: string | null) {
    this.rig = rig; this.direction = direction; this.solo = solo;
    const viewId=rig.directions[direction].view,view=rig.views[viewId],other=viewId==='Front'?'Back':'Front';
    const reusable=this.entries.size===view.parts.length&&view.parts.every(part=>this.entries.has(part.id));
    if(reusable)this.releaseMeshes();else this.clear();
    this.root.scale.setScalar(1100/view.referenceSize*view.displayScale);
    this.root.scale.x*=viewId==='Back'?-1:1;
    for(const part of view.parts){
      const previous=this.entries.get(part.id),bone=previous?.bone??new THREE.Bone();bone.name=part.id;
      this.entries.set(part.id,{bone,part,depth:thickness(part.id,part.rect.width)});
    }
    for(const entry of this.entries.values()){
      const {part,bone,depth}=entry,parent=part.attachment.parentId?this.entries.get(part.attachment.parentId):undefined;
      (parent?.bone??this.root).add(bone);
      const source=this.crop(assets,rig,viewId,part);if(!source)continue;
      const opposite=rig.views[other].parts.find(p=>p.id===part.id)!;
      const back=this.crop(assets,rig,other,opposite);
      const normalization=view.referenceSize/rig.views[other].referenceSize*rig.views[other].displayScale/view.displayScale;
      const images=this.standeeImages(source,back,part,opposite,normalization);
      const shapes=this.maskShapes(images.mask,images.pivot);if(!shapes.length)continue;
      const group=new THREE.Group();bone.add(group);entry.mesh=group;
      for(const [side,image] of [[viewId==='Front'?1:-1,images.front],[viewId==='Front'?-1:1,images.back]] as const){
        const geometry=new THREE.ShapeGeometry(shapes),pos=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
        for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+images.pivot.x)/images.front.width,1-(images.pivot.y-pos.getY(i))/images.front.height);
        const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;
        const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.4,side:side===1?THREE.FrontSide:THREE.BackSide});
        const mesh=new THREE.Mesh(geometry,material);mesh.position.z=side*depth*.5;group.add(mesh);this.resources.push(geometry,texture,material);
      }
      const geometry=new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:false,steps:1});
      // A single material ignores groups: index only side triangles so extrusion caps cannot cover the PNGs.
      const sides=geometry.groups.filter(g=>g.materialIndex===1);
      const indices=sides.flatMap(g=>Array.from({length:g.count},(_,i)=>g.start+i));
      geometry.setIndex(indices);geometry.clearGroups();
      const material=new THREE.MeshBasicMaterial({color:0x25232a,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.z=-depth*.5;group.add(mesh);this.resources.push(geometry,material);
    }
    if(!this.skeleton)this.skeleton=new THREE.Skeleton([...this.entries.values()].map(e=>e.bone));
    this.root.updateMatrixWorld(true);this.skeleton.calculateInverses();
  }

  render(seconds: number, mode: Mode) {
    if (this.disposed || !this.rig || !this.active) return;
    for (const pose of evaluateRig(this.rig, this.direction, seconds, mode)) {
      const entry = this.entries.get(pose.id)!;
      const p = bonePose(this.rig, this.direction, entry.part, pose);
      const parent = entry.part.attachment.parentId ? this.entries.get(entry.part.attachment.parentId) : undefined;
      entry.bone.position.set(p.x - (parent?.part.pivot.x ?? 0), p.y + (parent?.part.pivot.y ?? 0), p.z - (parent ? parent.part.zIndex * 8 : 0));
      entry.bone.rotation.set(p.rotationX, 0, p.rotationZ);
      // Z stays unscaled through every Bone, including parents: every standee is 4 rig units thick.
      entry.bone.scale.set(p.scaleX, p.scaleY, 1);
      // Preserve the editor's affine skew and rotation, with screen Y converted to world Y.
      const affine = matrix({ ...pose, x: 0, y: 0, scaleX: p.scaleX, scaleY: p.scaleY });
      entry.bone.matrixAutoUpdate = false;
      entry.bone.matrix.makeTranslation(entry.bone.position.x, entry.bone.position.y, entry.bone.position.z);
      entry.bone.matrix.multiply(new THREE.Matrix4().makeRotationX(p.rotationX));
      entry.bone.matrix.multiply(new THREE.Matrix4().set(affine.a,-affine.c,0,0, -affine.b,affine.d,0,0, 0,0,1,0, 0,0,0,1));
      entry.bone.matrixWorldNeedsUpdate = true;
      if (entry.mesh) entry.mesh.visible = pose.visible && (!this.solo || this.solo === pose.id);
    }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  private download(blob: Blob, name: string) {
    if (this.disposed) return;
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  capture() { this.renderer.domElement.toBlob(blob => { if (blob) this.download(blob, 'rig-3d-preview.png'); }); }
  record() {
    if (this.recorder?.state === 'recording') return;
    if (!('MediaRecorder' in window)) throw new Error('이 브라우저는 영상 저장을 지원하지 않습니다. PNG 저장을 사용하세요.');
    const stream = this.renderer.domElement.captureStream(30), chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream); this.recorder = recorder;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => { stream.getTracks().forEach(track => track.stop()); this.download(new Blob(chunks, { type: recorder.mimeType }), 'rig-3d-motion.webm'); };
    recorder.start(); this.recordingTimer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), 3000);
  }
  diagnostics() {
    const gl = this.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable';
    return { gpu, active: this.active, disposed: this.disposed, bones: [...this.entries.values()].map(e => ({ id: e.part.id, parent: e.bone.parent?.name || null, z: e.bone.position.z, thickness: e.depth, meshes: e.mesh?.children.length ?? 0 })), canvas: { width: this.renderer.domElement.width, height: this.renderer.domElement.height }, memory: this.renderer.info.memory, calls: this.renderer.info.render.calls };
  }
  destroy() { if (this.disposed) return; this.disposed = true; this.observer.disconnect(); clearTimeout(this.recordingTimer); if (this.recorder?.state === 'recording') this.recorder.stop(); this.controls.dispose(); this.clear(); this.grid.geometry.dispose(); (Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material]).forEach(m => m.dispose()); this.scene.clear(); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
