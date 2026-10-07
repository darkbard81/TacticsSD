import * as THREE from 'three';
import { PaintedTerrain } from './painted-terrain';
import itemFrames from './assets/items.json' with { type: 'json' };
import { evaluateWorldRig } from '../tools/characterRig/domain/animator';
import { buildStandeePanel, cropPart, StandeeRig } from '../tools/characterRig/runtime/standee';
import { identity, type CharacterRigData, type DirectionId, type Part } from '../tools/characterRig/domain/rig';
import { CLASS_PART_IDS, ClassStandees, classPartFor, loadStandee, type LoadedStandee } from './class-standees';
import { weaponFor } from './content';
import { weaponVisible } from './presentation-state';
import { type Battle, type Pos, type Unit, type Command, tileAt, same, reachable, targets, commandAbility } from './domain';
export type VisualState = { command: Command; battle: Battle | null; cursor: Pos; selected: string | null; mode: string; top: boolean; zoom: number; pan: Pos; paused: boolean };
type Actor = { root: THREE.Group; facing: THREE.Group; rig: StandeeRig; bundle: LoadedStandee; marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; arrow: THREE.Mesh; label: HTMLDivElement; weaponId: string; weapon?: THREE.Group };
const HEIGHT = .32;
const facingAngle: Record<DirectionId, number> = { Front: 0, Back: Math.PI, SE: Math.PI / 2, SW: 0, NE: Math.PI, NW: -Math.PI / 2 };
/** One WebGL scene and depth buffer for the entire battlefield. DOM handles annotations/HUD. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private gpu: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-8, 8, 6, -6, .1, 100);
  private ground = new THREE.Group();
  private highlights = new THREE.Group();
  private actors = new Map<string, Actor>();
  private classes = new ClassStandees();
  private custom?: LoadedStandee;
  private painted = new PaintedTerrain();
  private tileMeshes: THREE.Mesh[] = [];
  private terrainKey = '';
  private ray = new THREE.Raycaster();
  private labels = document.createElement('div');
  private status = document.createElement('div');
  private weapons = new Image();
  private items = new Image();
  private weaponPanels = new Map<string, ReturnType<typeof buildStandeePanel>>();
  private attacks = new Map<string, { start: number; kind: string }>();
  private routes = new Map<string, { path: Pos[]; start: number }>();
  private previousHP = new Map<string, number>();
  private effects = new Map<string, number>();
  private fallen = new Map<string, number>();
  private animationTime = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  private unitsPerPixel = .02;
  private captureView: 'Front' | 'Back' | null = null;
  private highlightKey = '';
  private galleryView: 'Front' | 'Back' | null = null;
  private gallery = new THREE.Group();
  private galleryRigs: StandeeRig[] = [];
  private lastVisual?: VisualState;
  private exporting = false;
  private restoreContext = () => { this.status.hidden = true; };
  constructor(host: HTMLElement) {
    this.gpu = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.gpu.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.gpu.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.gpu.domElement; this.canvas.setAttribute('aria-label', 'Three.js 높낮이 전술 전장'); this.canvas.setAttribute('role', 'img');
    this.canvas.dataset.renderer = 'three'; host.append(this.canvas);
    this.scene.background = new THREE.Color('#203c40'); this.scene.add(this.ground, this.highlights, this.gallery);
    this.labels.className = 'battle-labels'; this.status.className = 'battle-render-status'; this.status.textContent = '3D 클래스 파츠 불러오는 중…';
    host.append(this.labels, this.status);
    void this.painted.ready.then(() => { this.terrainKey = ''; });
    this.weapons.src = new URL('./assets/weapons.png', import.meta.url).href; this.items.src = new URL('./assets/items.png', import.meta.url).href;
    void this.classes.ready.then(() => { this.status.hidden = true; }).catch(error => { this.status.textContent = String(error); });
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.status.hidden = false; this.status.textContent = 'WebGL 장면 복구 중…'; });
    this.canvas.addEventListener('webglcontextrestored', this.restoreContext);
  }
  async setRig(data: CharacterRigData, url: string, assets: Record<string, string> = {}) {
    const bundle = await loadStandee(data, ref => assets[ref.id] ?? assets[ref.name] ?? (ref.id === data.views.Front.image?.id ? url : new URL(ref.name, new URL(url, location.href)).href));
    this.clearActors(); this.custom?.template.clear(); this.custom = bundle;
  }
  async restoreDefaultRig() { await this.classes.ready; this.clearActors(); this.custom?.template.clear(); this.custom = undefined; }
  private clearActors() {
    for (const actor of this.actors.values()) { actor.root.removeFromParent(); actor.label.remove(); actor.rig.clear(); actor.marker.geometry.dispose(); actor.marker.material.dispose(); (actor.arrow.geometry as THREE.BufferGeometry).dispose(); (actor.arrow.material as THREE.Material).dispose(); }
    this.actors.clear();
  }
  private configureCamera(s: VisualState, focus?: THREE.Vector3) {
    const w = this.w, h = this.h;
    this.unitsPerPixel = Math.max((s.top ? 8.8 : 11.3) / Math.max(350, w - 370), (s.top ? 9 : 8.4) / Math.max(300, h - 225)) / s.zoom;
    const target = focus ?? new THREE.Vector3(3.5, .45, 3.5);
    const offset = this.captureView ? new THREE.Vector3(this.captureView === 'Front' ? 9 : -9, 7, this.captureView === 'Front' ? 18 : -18) : s.top ? new THREE.Vector3(0, 24, .001) : new THREE.Vector3(13, 15, 13);
    this.camera.position.copy(target).add(offset); this.camera.up.set(0, 1, 0); this.camera.lookAt(target); this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.camera.position.addScaledVector(right, -s.pan.x * this.unitsPerPixel).addScaledVector(up, s.pan.y * this.unitsPerPixel);
    this.camera.left = -w * this.unitsPerPixel / 2; this.camera.right = w * this.unitsPerPixel / 2;
    this.camera.top = h * this.unitsPerPixel / 2; this.camera.bottom = -h * this.unitsPerPixel / 2; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }
  point(p: Pos, h: number, _top: boolean): Pos { const v = new THREE.Vector3(p.x, h * HEIGHT, p.y).project(this.camera); return { x: (v.x + 1) * this.w / 2, y: (1 - v.y) * this.h / 2 }; }
  pick(x: number, y: number, s: VisualState): Pos | null {
    if (!s.battle) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    const hit = this.ray.intersectObjects(this.tileMeshes, false)[0]; return hit ? hit.object.userData.tile as Pos : null;
  }
  private syncTerrain(b: Battle) {
    const key = b.stage + ':' + b.tiles.map(t => `${t.x},${t.y},${t.h},${t.kind},${t.block}`).join('|'); if (key === this.terrainKey) return;
    this.terrainKey = key; this.highlightKey = '';
    this.ground.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { o.geometry.dispose(); if (o.userData.prop && o instanceof THREE.Mesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { (m as THREE.MeshBasicMaterial).map?.dispose(); m.dispose(); } } if (o instanceof THREE.Line) (o.material as THREE.Material).dispose(); } });
    this.ground.clear(); this.tileMeshes = [];
    this.tileMeshes = this.painted.build(b, this.ground);
  }

  private syncHighlights(s: VisualState) {
    const b = s.battle!, selected = b.units.find(u => u.id === s.selected);
    // Unit positions/resources can change without replacing the Battle object.
    const key = `${s.mode}|${s.selected}|${s.command}|${s.cursor.x},${s.cursor.y}|${b.units.map(u => `${u.id},${u.x},${u.y},${u.hp},${u.mp},${u.tp}`).join(';')}`;
    if (key === this.highlightKey) return; this.highlightKey = key;
    for (const child of this.highlights.children) { const mesh = child as THREE.Mesh; mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } this.highlights.clear();
    const move = selected && s.mode === 'move' ? reachable(b, selected) : [], target = selected && s.mode === 'target' ? targets(b, selected, s.command) : [];
    for (const t of b.tiles) {
      const cursor = same(t, s.cursor), color = cursor ? '#ffe792' : move.some(p => same(p, t)) ? '#5be5d2' : target.some(p => same(p, t)) ? '#ffb64d' : null; if (!color) continue;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.94, .94), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: cursor ? .6 : .32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(t.x, t.h * HEIGHT + .013, t.y); this.highlights.add(mesh);
    }
  }
  private createActor(u: Unit, bundle: LoadedStandee): Actor {
    const root = new THREE.Group(), facing = new THREE.Group(), rig = bundle.template.fork(); root.add(facing); facing.add(rig.root); this.scene.add(root);
    const marker = new THREE.Mesh(new THREE.RingGeometry(.24, .31, 24), new THREE.MeshBasicMaterial({ color: u.team === 'ally' ? '#67d8ca' : '#ee8d83', side: THREE.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.position.y = .024; root.add(marker);
    const shape = new THREE.Shape([new THREE.Vector2(-.09, -.06), new THREE.Vector2(.09, -.06), new THREE.Vector2(0, .14)]);
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#fff1c6', side: THREE.DoubleSide })); arrow.rotation.x = -Math.PI / 2; arrow.position.y = .026; root.add(arrow);
    const label = document.createElement('div'); label.className = `battle-unit-label ${u.team}`; label.dataset.hero = String(u.hero); label.innerHTML = '<span></span><i><b></b></i>'; this.labels.append(label);
    return { root, facing, rig, bundle, marker, arrow, label, weaponId: '' };
  }
  private weaponPanel(u: Unit) {
    const weapon = weaponFor(u.hero, u.weaponVariant); let panel = this.weaponPanels.get(weapon.id); if (panel) return panel;
    if (!this.weapons.complete || !this.weapons.naturalWidth || !this.items.complete || !this.items.naturalWidth) return;
    const cw = this.weapons.naturalWidth / 4, ch = this.weapons.naturalHeight / 2, canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d')!, item = weapon.iconId ? (itemFrames as Record<string, { x: number; y: number; w: number; h: number }>)[weapon.iconId] : undefined;
    if (item) ctx.drawImage(this.items, item.x, item.y, item.w, item.h, 0, 0, cw, ch);
    else ctx.drawImage(this.weapons, weapon.frame % 4 * cw, Math.floor(weapon.frame / 4) * ch, cw, ch, 0, 0, cw, ch);
    const part: Part = { id: 'weapon', attachment: { parentId: null, socket: { x: 0, y: 0 } }, rect: { x: 0, y: 0, width: cw, height: ch }, pivot: { x: cw * weapon.grip.x, y: ch * weapon.grip.y }, restTransform: identity(), zIndex: 0, visible: true };
    panel = buildStandeePanel(canvas, undefined, part); this.weaponPanels.set(weapon.id, panel); return panel;
  }
  private updateActor(u: Unit, b: Battle, s: VisualState) {
    const bundle = this.custom ?? this.classes.get(u.hero); if (!bundle) return;
    let actor = this.actors.get(u.id); if (!actor) { actor = this.createActor(u, bundle); this.actors.set(u.id, actor); }
    const current = this.visualPosition(u, b), oldHP = this.previousHP.get(u.id);
    if (oldHP !== undefined && u.hp < oldHP) this.effects.set(u.id, this.animationTime + .4);
    this.previousHP.set(u.id, u.hp);
    if (u.hp <= 0 && !this.fallen.has(u.id)) this.fallen.set(u.id, this.animationTime);
    const fall = this.fallen.get(u.id), collapse = fall === undefined ? 0 : Math.min(1, (this.animationTime - fall) / .65);
    actor.root.visible = collapse < 1; actor.label.hidden = u.hp <= 0; if (!actor.root.visible) return;
    actor.root.position.set(current.x, current.h * HEIGHT + .025, current.y);
    const view = bundle.rig.views.Front, scalar = (s.top ? .88 : 1.8) / view.referenceSize * view.displayScale;
    actor.rig.root.scale.setScalar(scalar);
    // Top is a board overview: lay the complete rigid standee towards the camera, with a ground arrow for facing.
    if (s.top && !this.captureView) { actor.facing.quaternion.copy(this.camera.quaternion); actor.facing.rotateY(['NE', 'NW', 'Back'].includes(current.facing) ? Math.PI : 0); actor.facing.position.set(0, .08, .36); }
    else { actor.facing.rotation.set(0, facingAngle[current.facing], 0); actor.facing.position.set(0, 0, 0); }
    if (collapse) actor.facing.rotateZ(collapse * Math.PI / 2);
    actor.marker.material.color.set(s.selected === u.id ? '#ffe792' : u.team === 'ally' ? '#67d8ca' : '#ee8d83');
    actor.marker.material.opacity = u.done ? .45 : 1; actor.marker.material.transparent = u.done;
    const yaw = facingAngle[current.facing]; actor.arrow.position.set(Math.sin(yaw) * .36, .026, Math.cos(yaw) * .36); actor.arrow.rotation.z = yaw + Math.PI;
    const attack = this.attacks.get(u.id), progress = attack && this.animationTime >= attack.start ? Math.min(1, (this.animationTime - attack.start) / .65) : 1;
    const weapon = weaponFor(u.hero, u.weaponVariant), motion = attack?.kind === 'item' ? 'item' : attack?.kind === 'skill' ? commandAbility(u, 'skill').animation : weapon.animation;
    const hit = Math.max(0, (this.effects.get(u.id) ?? 0) - this.animationTime);
    if (attack && this.animationTime >= attack.start + .65) this.attacks.delete(u.id);
    actor.rig.pose(this.animationTime * (current.walking ? 1 : .55), 'Walk', poses => {
      const wave = progress < 1 ? Math.sin(progress * Math.PI) : 0;
      for (const pose of poses) {
        if (pose.id === 'armR') { pose.rotation -= (motion === 'slash' ? 1.65 : motion === 'shoot' ? .9 : .65) * wave; if (motion === 'thrust') pose.y -= view.referenceSize * .12 * wave; }
        if (pose.id === 'armL' && ['heal', 'cast', 'item'].includes(motion)) pose.rotation += .7 * wave;
        if (pose.id === 'body') { if (motion === 'item') pose.y -= view.referenceSize * .045 * wave; if (hit) { pose.x += Math.sin(this.animationTime * 65) * view.referenceSize * .012; pose.rotation += .07; } }
      }
    });
    if (actor.weaponId !== weapon.id) {
      const panel = this.weaponPanel(u), arm = actor.rig.part('armR'), bone = actor.rig.bone('armR');
      if (panel && arm && bone) {
        actor.weapon?.removeFromParent(); const mesh = panel.group.clone(true); actor.weapon = mesh; actor.weaponId = weapon.id;
        mesh.position.set(arm.rect.width * .5 - arm.pivot.x, -(arm.rect.height * .86 - arm.pivot.y), 5);
        // The weapon inherits the full hand/bone matrix, including depth and attack rotation.
        const size = arm.rect.height * (weapon.family === 'bow' ? 1.75 : 2.1) / (this.weapons.naturalHeight / 2); mesh.scale.set(size, size, 1); mesh.rotation.z = weapon.family === 'bow' ? -.65 : .28; bone.add(mesh);
      }
    }
    // Equipment exists on the hand, but is drawn only during a live damaging attack.
    if (actor.weapon) actor.weapon.visible = weaponVisible({ kind: attack?.kind, progress, damagingSkill: attack?.kind === 'skill' && commandAbility(u, 'skill').effect === 'damage', walking: current.walking, hurt: hit > 0, collapsed: collapse > 0 });
    actor.root.updateMatrixWorld(true);
    const labelPoint = actor.root.localToWorld(new THREE.Vector3(0, s.top ? .08 : 1.93, 0)).project(this.camera);
    actor.label.style.transform = `translate(${(labelPoint.x + 1) * this.w / 2}px, ${(1 - labelPoint.y) * this.h / 2}px) translate(-50%, -100%)`;
    actor.label.querySelector('span')!.textContent = u.name;
    (actor.label.querySelector('b') as HTMLElement).style.width = `${Math.max(0, u.hp / u.maxHp) * 100}%`;
  }
  draw(s: VisualState, now: number) {
    if (this.exporting) return;
    this.lastVisual = s;
    const w = innerWidth, h = innerHeight; if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.gpu.setSize(w, h); }
    const dt = this.last ? Math.max(0, (now - this.last) / 1000) : 0; this.last = now; if (!s.paused) this.animationTime += dt;
    if (this.galleryView) { this.drawGallery(); return; }
    this.gallery.visible = false; this.ground.visible = this.highlights.visible = true;
    this.canvas.hidden = !s.battle; this.labels.hidden = !s.battle; if (!s.battle) return;
    this.configureCamera(s); this.syncTerrain(s.battle); this.painted.view(s.top); this.syncHighlights(s);
    for (const u of s.battle.units) this.updateActor(u, s.battle, s);
    this.gpu.render(this.scene, this.camera);
  }
  attack(id: string, kind: string, delay = 0) { this.attacks.set(id, { start: this.animationTime + delay, kind }); }
  move(id: string, path: Pos[]) { if (path.length < 2) this.routes.delete(id); else this.routes.set(id, { path, start: this.animationTime }); }
  reset() { this.routes.clear(); this.attacks.clear(); this.previousHP.clear(); this.effects.clear(); this.fallen.clear(); this.clearActors(); }
  private visualPosition(u: Unit, b: Battle) {
    const route = this.routes.get(u.id); if (!route) return { ...u, h: tileAt(b, u)!.h, walking: false, facing: u.facing };
    const step = Math.min(route.path.length - 1, (this.animationTime - route.start) / .16), i = Math.floor(step), t = step - i, a = route.path[i], z = route.path[Math.min(i + 1, route.path.length - 1)];
    const facing: DirectionId = z.x > a.x ? 'SE' : z.x < a.x ? 'NW' : z.y > a.y ? 'SW' : z.y < a.y ? 'NE' : u.facing;
    return { facing, x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t, h: tileAt(b, a)!.h + (tileAt(b, z)!.h - tileAt(b, a)!.h) * t, walking: step < route.path.length - 1 };
  }
  portraits(host: HTMLElement, _gear: Array<{ weapon: number }>) {
    const draw = () => host.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]').forEach(canvas => {
      const bundle = this.custom ?? this.classes.get(Number(canvas.dataset.portrait)); if (!bundle) return;
      const ctx = canvas.getContext('2d')!, view = bundle.rig.views.Front; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(100, 215);
      const scale = 205 / view.referenceSize * view.displayScale; ctx.scale(scale, scale);
      for (const pose of evaluateWorldRig(bundle.rig, 'Front', 0, 'Rest').sort((a, b) => a.zIndex - b.zIndex)) {
        const part = view.parts.find(p => p.id === pose.id)!, image = cropPart(bundle.assets, bundle.rig, 'Front', part); if (!image) continue;
        const m = pose.matrix; ctx.save(); ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty); ctx.drawImage(image, 0, 0); ctx.restore();
      }
      ctx.restore();
    }); draw(); void this.classes.ready.then(draw).catch(() => undefined);
  }
  /** Actual registered game meshes, presented for user inspection in the same renderer/scene. */
  async setGallery(view: 'Front' | 'Back' | null) {
    await this.classes.ready; this.galleryView = view; document.body.classList.toggle('class-gallery', Boolean(view));
    for (const rig of this.galleryRigs) rig.clear(); this.galleryRigs = [];
    this.gallery.traverse(object => {
      if (object.userData.caption && object instanceof THREE.Mesh) {
        object.geometry.dispose(); const material = object.material as THREE.MeshBasicMaterial;
        material.map?.dispose(); material.dispose();
      }
    });
    this.gallery.clear();
    if (!view) return;
    CLASS_PART_IDS.forEach((id, index) => {
      const bundle = this.classes.entries.get(id)!, rig = bundle.template.fork();
      rig.root.scale.setScalar(2.5 / bundle.rig.views.Front.referenceSize);
      rig.root.rotation.y = view === 'Back' ? Math.PI : 0;
      rig.root.position.set((index % 4 - 1.5) * 3.15, index < 4 ? 3.8 : 0, 0);
      rig.pose(0, 'Rest'); this.gallery.add(rig.root); this.galleryRigs.push(rig);
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 80;
      const context = canvas.getContext('2d')!; context.font = '36px system-ui'; context.textAlign = 'center'; context.fillStyle = '#f6e2b6';
      context.fillText(`${id.toUpperCase()} · ${view.toUpperCase()}`, 320, 51);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(3, .375), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      label.userData.caption = true; label.position.copy(rig.root.position).add(new THREE.Vector3(0, -.35, .1)); this.gallery.add(label);
    });
  }
  private drawGallery() {
    this.canvas.hidden = false; this.labels.hidden = true;
    this.ground.visible = this.highlights.visible = false; this.gallery.visible = true;
    for (const actor of this.actors.values()) actor.root.visible = false;
    const upp = Math.max(13.2 / this.w, 8 / this.h);
    this.unitsPerPixel = upp; this.camera.position.set(0, 3.45, 24); this.camera.up.set(0, 1, 0); this.camera.lookAt(0, 3.45, 0);
    this.camera.left = -this.w * upp / 2; this.camera.right = this.w * upp / 2;
    this.camera.top = this.h * upp / 2; this.camera.bottom = -this.h * upp / 2;
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld(); this.gpu.render(this.scene, this.camera);
  }
  setCaptureView(view: 'Front' | 'Back' | null) { this.captureView = view; }
  /** A fresh high-resolution render, not a resized low-resolution screenshot. */
  async capture(detail = false, waterDetail = false) {
    const previousRatio = this.gpu.getPixelRatio(), previousWidth = this.w, previousHeight = this.h;
    const css = this.canvas.getBoundingClientRect(); this.exporting = true;
    try {
      // Fixed landscape export viewport; leave the user's actual browser/CSS size untouched.
      this.w = 1280; this.h = 720;
      this.gpu.setPixelRatio(3); this.gpu.setSize(this.w, this.h, false);
      if (this.galleryView) this.drawGallery();
      else { if (this.lastVisual) this.configureCamera(detail || waterDetail ? { ...this.lastVisual, zoom: this.lastVisual.zoom * (waterDetail ? 3 : 1.75), pan: { x: 0, y: 0 } } : this.lastVisual, waterDetail ? new THREE.Vector3(3, -.16, 7.15) : undefined); this.gpu.render(this.scene, this.camera); }
      const metadata = {
        capturedAt: new Date().toISOString(), terrainStage: this.lastVisual?.battle?.stage, detail, waterDetail, view: this.galleryView ? `classes-${this.galleryView.toLowerCase()}` : this.lastVisual?.top ? 'battle-top' : 'battle-iso',
        css: { width: css.width, height: css.height }, logicalRenderViewport: { width: this.w, height: this.h }, backing: { width: this.canvas.width, height: this.canvas.height },
        deviceDPR: window.devicePixelRatio, interactiveRenderDPR: previousRatio, exportRenderDPR: this.gpu.getPixelRatio(),
        visualViewportScale: window.visualViewport?.scale ?? null, gameZoom: this.lastVisual?.zoom ?? null,
        camera: { unitsPerRenderPixel: this.unitsPerPixel, position: this.camera.position.toArray(), left: this.camera.left, right: this.camera.right, top: this.camera.top, bottom: this.camera.bottom },
        pose: this.galleryView ? 'Rest' : 'live idle', animationTime: this.animationTime, classes: this.galleryView ? [...CLASS_PART_IDS] : null,
        source: 'same live Three.js scene; freshly rendered PNG; DOM HUD excluded',
      };
      const blob = await new Promise<Blob>((resolve, reject) => this.canvas.toBlob(value => value ? resolve(value) : reject(Error('PNG 캡처 실패'))));
      return { blob, metadata };
    } finally {
      this.w = previousWidth; this.h = previousHeight; this.gpu.setPixelRatio(previousRatio); this.gpu.setSize(this.w, this.h, false);
      if (this.galleryView) this.drawGallery();
      else if (this.lastVisual) { this.configureCamera(this.lastVisual); this.gpu.render(this.scene, this.camera); }
      this.exporting = false;
    }
  }
  get dimensions() { return { width: this.w, height: this.h, backingWidth: this.canvas.width, backingHeight: this.canvas.height, dpr: this.gpu.getPixelRatio() }; }
  diagnostics() { return { renderer: 'three', sceneCount: 1, classes: [...this.classes.entries.keys()], actors: [...this.actors].map(([id, a]) => ({ id, class: this.custom ? 'custom' : classPartFor(Number(a.label.dataset.hero ?? 0)), parts: a.rig.diagnostics(), weapon: a.weaponId })), memory: this.gpu.info.memory }; }
}
