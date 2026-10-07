import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StandeeRig } from './standee';
import type { CharacterRigData, DirectionId, Mode } from '../domain/rig';
import type { RigAssets } from './assets';

export class Preview3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
  private standee = new StandeeRig();
  private root = this.standee.root;
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private rig?: CharacterRigData;
  private disposed = false;
  private active = false;
  private recorder?: MediaRecorder;
  private recordingTimer?: ReturnType<typeof setTimeout>;
  private grid: THREE.GridHelper;
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
  clear() { this.standee.clear(); }
  sync(rig: CharacterRigData, assets: RigAssets, direction: DirectionId, solo: string | null) {
    this.rig = rig; this.standee.sync(rig, assets, direction, solo);
    const viewId = rig.directions[direction].view, view = rig.views[viewId];
    this.root.scale.setScalar(1100 / view.referenceSize * view.displayScale);
    this.root.scale.x *= viewId === 'Back' ? -1 : 1;
  }
  render(seconds: number, mode: Mode) {
    if (this.disposed || !this.rig || !this.active) return;
    this.standee.pose(seconds, mode); this.controls.update(); this.renderer.render(this.scene, this.camera);
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
    return { gpu, active: this.active, disposed: this.disposed, bones: this.standee.diagnostics(), canvas: { width: this.renderer.domElement.width, height: this.renderer.domElement.height }, memory: this.renderer.info.memory, calls: this.renderer.info.render.calls };
  }
  destroy() { if (this.disposed) return; this.disposed = true; this.observer.disconnect(); clearTimeout(this.recordingTimer); if (this.recorder?.state === 'recording') this.recorder.stop(); this.controls.dispose(); this.clear(); this.grid.geometry.dispose(); (Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material]).forEach(m => m.dispose()); this.scene.clear(); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
