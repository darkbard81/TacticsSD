import * as THREE from 'three';
import { matrix } from '../domain/transform';
import { evaluateRig, type EvaluatedPart } from '../domain/animator';
import { bonePose, thickness, LAYER_DEPTH } from '../domain/preview3d';
import type { CharacterRigData, DirectionId, Mode, Part, ViewId, ImageRef } from '../domain/rig';
/** Image-only contract keeps the game independent of the editor's Pixi asset store. */
export type StandeeAssets = { get(id: string | undefined): { image: HTMLImageElement; ref: ImageRef } | undefined };
type Entry = { bone: THREE.Bone; mesh?: THREE.Group; part: Part; depth: number };
export function cropPart(assets: StandeeAssets, rig: CharacterRigData, viewId: ViewId, part: Part) {
    const view = rig.views[viewId], asset = assets.get(part.replacement?.id ?? view.image?.id);
    if (!asset) return;
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(part.rect.width); canvas.height = Math.ceil(part.rect.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const r = part.replacement ? { x: 0, y: 0, width: asset.ref.width, height: asset.ref.height } : part.rect;
    ctx.drawImage(asset.image, r.x, r.y, r.width, r.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
export function standeeImages(front: HTMLCanvasElement, back: HTMLCanvasElement | undefined, part: Part, opposite: Part, normalization: number) {
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
export function maskShapes(mask: HTMLCanvasElement, pivot: {x:number;y:number}) {
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

/** Alpha contour caps and 4-unit solid sides. Canvas is only an upload-time texture source. */
export function buildStandeePanel(front: HTMLCanvasElement, back: HTMLCanvasElement | undefined, part: Part, opposite: Part = part, normalization = 1, viewId: ViewId = 'Front') {
  const images = standeeImages(front, back, part, opposite, normalization);
  const shapes = maskShapes(images.mask, images.pivot), depth = thickness(part.id, part.rect.width);
  const group = new THREE.Group(), resources: { dispose(): void }[] = [];
  if (!shapes.length) return { group, resources };
  for (const [side, image] of [[viewId === 'Front' ? 1 : -1, images.front], [viewId === 'Front' ? -1 : 1, images.back]] as const) {
    const geometry = new THREE.ShapeGeometry(shapes), pos = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + images.pivot.x) / images.front.width, 1 - (images.pivot.y - pos.getY(i)) / images.front.height);
    const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, alphaTest: .4, side: side === 1 ? THREE.FrontSide : THREE.BackSide });
    const mesh = new THREE.Mesh(geometry, material); mesh.position.z = side * depth * .5; group.add(mesh); resources.push(geometry, texture, material);
  }
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, steps: 1 });
  geometry.setIndex(geometry.groups.filter(g => g.materialIndex === 1).flatMap(g => Array.from({ length: g.count }, (_, i) => g.start + i)));
  geometry.clearGroups();
  const material = new THREE.MeshBasicMaterial({ color: 0x25232a, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.z = -depth * .5; group.add(mesh); resources.push(geometry, material);
  return { group, resources };
}
export class StandeeRig {
  readonly root = new THREE.Group();
  readonly entries = new Map<string, Entry>();
  private resources: { dispose(): void }[] = [];
  private rig?: CharacterRigData;
  private direction: DirectionId = 'Front';
  private solo: string | null = null;
  clear() { this.root.clear(); this.entries.clear(); for (const resource of this.resources) resource.dispose(); this.resources = []; }
  sync(rig: CharacterRigData, assets: StandeeAssets, direction: DirectionId, solo: string | null = null) {
    this.clear(); this.rig = rig; this.direction = direction; this.solo = solo;
    const viewId = rig.directions[direction].view, view = rig.views[viewId], other = viewId === 'Front' ? 'Back' : 'Front';
    this.root.scale.set(1, 1, 1);
    for (const part of view.parts) { const bone = new THREE.Bone(); bone.name = part.id; this.entries.set(part.id, { bone, part, depth: thickness(part.id, part.rect.width) }); }
    for (const entry of this.entries.values()) {
      const { part, bone } = entry, parent = part.attachment.parentId ? this.entries.get(part.attachment.parentId) : undefined;
      (parent?.bone ?? this.root).add(bone);
      const source = cropPart(assets, rig, viewId, part); if (!source) continue;
      const opposite = rig.views[other].parts.find(p => p.id === part.id)!;
      // Child scales are relative to their parent. Cap registration needs full ancestor scale.
      const parentScale = (id: string | null, sourceView: ViewId): { x: number; y: number } => {
        if (!id) return { x: 1, y: 1 };
        const ancestor = rig.views[sourceView].parts.find(p => p.id === id)!;
        const above = parentScale(ancestor.attachment.parentId, sourceView);
        return { x: above.x * ancestor.restTransform.scaleX, y: above.y * ancestor.restTransform.scaleY };
      };
      const currentParent = parentScale(part.attachment.parentId, viewId), oppositeParent = parentScale(opposite.attachment.parentId, other);
      const aligned = { ...opposite, restTransform: { ...opposite.restTransform,
        scaleX: opposite.restTransform.scaleX * oppositeParent.x / currentParent.x,
        scaleY: opposite.restTransform.scaleY * oppositeParent.y / currentParent.y } };
      const panel = buildStandeePanel(source, cropPart(assets, rig, other, opposite), part, aligned, view.referenceSize / rig.views[other].referenceSize * rig.views[other].displayScale / view.displayScale, viewId);
      bone.add(panel.group); entry.mesh = panel.group; this.resources.push(...panel.resources);
    }
  }
  /** Instances share immutable geometries/textures; each owns its bone transforms. */
  fork() {
    const copy = new StandeeRig(); copy.rig = this.rig; copy.direction = this.direction;
    const tree = this.root.clone(true); copy.root.add(...[...tree.children]);
    for (const [id, entry] of this.entries) { const bone = copy.root.getObjectByName(id) as THREE.Bone; copy.entries.set(id, { ...entry, bone, mesh: bone.children.find(c => c.type === 'Group') as THREE.Group | undefined }); }
    return copy;
  }
  bone(id: string) { return this.entries.get(id)?.bone; }
  part(id: string) { return this.entries.get(id)?.part; }
  pose(seconds: number, mode: Mode, modify?: (poses: EvaluatedPart[]) => void) {
    if (!this.rig) return;
    const poses = evaluateRig(this.rig, this.direction, seconds, mode); modify?.(poses);
    for (const pose of poses) {
      const entry = this.entries.get(pose.id)!;
      const p = bonePose(this.rig, this.direction, entry.part, pose);
      const parent = entry.part.attachment.parentId ? this.entries.get(entry.part.attachment.parentId) : undefined;
      entry.bone.position.set(p.x - (parent?.part.pivot.x ?? 0), p.y + (parent?.part.pivot.y ?? 0), p.z - (parent ? parent.part.zIndex * LAYER_DEPTH : 0));
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

  }
  diagnostics() { return [...this.entries.values()].map(e => ({ id: e.part.id, parent: e.bone.parent?.name || null, z: e.bone.position.z, thickness: e.depth, meshes: e.mesh?.children.length ?? 0 })); }
}
