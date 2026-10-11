import * as THREE from 'three';
import { jobForHero } from './content';
import type { DirectionId } from '../tools/characterRig/domain/rig';

export const SPRITE_CLASS_IDS = ['warrior', 'archer', 'wizard', 'cleric', 'spellblade', 'knight', 'terror-knight', 'berserker'] as const;
export type SpriteClass = typeof SPRITE_CLASS_IDS[number];
const classMapping: Record<string, SpriteClass> = { warrior: 'warrior', ranger: 'archer', arcanist: 'wizard', healer: 'cleric', spellblade: 'spellblade', knight: 'knight', sentinel: 'knight', sage: 'cleric', 'terror-knight': 'terror-knight', berserker: 'berserker' };
export const spriteClassFor = (hero: number) => classMapping[jobForHero(hero).id];
export type SpriteSocket = { x: number; y: number; angle: number; behind: boolean };
export type SpriteAtlas = { frameWidth: 256; frameHeight: 256; columns: 8; rows: 2; anchor: { x: number; y: number }; referenceSize?: number; sockets: Record<string, SpriteSocket>; sources: unknown[] };
export type LoadedSprite = { atlas: SpriteAtlas; image: HTMLImageElement; texture: THREE.Texture };
const imageURLs = import.meta.glob('./assets/character-sprites/*/sheet.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const dataURLs = import.meta.glob('./assets/character-sprites/*/sheet.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export class ClassSpriteSheets {
  readonly entries = new Map<SpriteClass, LoadedSprite>();
  readonly ready = Promise.all(SPRITE_CLASS_IDS.filter(id => imageURLs[`./assets/character-sprites/${id}/sheet.png`]).map(id => this.load(id)));
  private async load(id: SpriteClass) {
    const prefix = `./assets/character-sprites/${id}/sheet`;
    if (!imageURLs[prefix + '.png'] || !dataURLs[prefix + '.json']) throw Error(`${id}: 캐릭터 시트를 찾을 수 없습니다.`);
    const response = await fetch(dataURLs[prefix + '.json']); if (!response.ok) throw Error(`${id}: 캐릭터 프레임 정보를 불러오지 못했습니다.`);
    const atlas: SpriteAtlas = await response.json();
    const image = new Image(); image.src = imageURLs[prefix + '.png']; await image.decode();
    if (image.naturalWidth !== 2048 || image.naturalHeight !== 512 || atlas.frameWidth !== 256 || atlas.frameHeight !== 256 || atlas.columns !== 8 || atlas.rows !== 2) throw Error(`${id}: 256×256 / 8×2 시트 규격이 일치하지 않습니다.`);
    if (atlas.referenceSize !== undefined && (!Number.isFinite(atlas.referenceSize) || atlas.referenceSize <= 0)) throw Error(`${id}: 캐릭터 기준 크기가 올바르지 않습니다.`);
    for (const key of ['front:4', 'front:5', 'back:4', 'back:5']) { const socket = atlas.sockets[key]; if (!socket || !Number.isFinite(socket.x) || !Number.isFinite(socket.y) || !Number.isFinite(socket.angle)) throw Error(`${id}: 공격 손 위치 정보가 누락되었습니다.`); }
    const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
    this.entries.set(id, { atlas, image, texture });
  }
  get(hero: number) { return this.entries.get(spriteClassFor(hero)); }
}

/** UVs belong to each mesh. Shared textures are never mutated during playback. */
export class SpriteActor {
  readonly root = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private weapon?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private weaponId = '';
  private column = -1;
  private row = -1;
  private flip = false;
  private clock = 0;
  private state = '';
  constructor(readonly bundle: LoadedSprite) {
    const geometry = new THREE.PlaneGeometry(256, 256);
    geometry.translate(128 - bundle.atlas.anchor.x, bundle.atlas.anchor.y - 128, 0);
    const material = new THREE.MeshBasicMaterial({ map: bundle.texture, alphaTest: .5, depthTest: true, depthWrite: true, transparent: false, alphaToCoverage: true });
    this.mesh = new THREE.Mesh(geometry, material); this.root.add(this.mesh);
    this.frame(0, 'front', false);
  }
  face(camera: THREE.Camera, direction: DirectionId, top: boolean) {
    this.root.quaternion.copy(camera.quaternion);
    const yaw: Record<DirectionId, number> = { Front: 0, Back: Math.PI, SE: Math.PI / 2, SW: 0, NE: Math.PI, NW: -Math.PI / 2 };
    const forward = new THREE.Vector3(Math.sin(yaw[direction]), 0, Math.cos(yaw[direction]));
    // A vertical camera has no horizontal viewing vector; the screen diagonal gives a stable Top azimuth.
    const viewer = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, top ? 1 : 2); viewer.y = 0; viewer.normalize();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
    if (top) {
      viewer.negate().add(right).normalize();
      // Match the synthesized Top azimuth: the physical screen-right vector
      // makes SW and NE perpendicular and otherwise loses one mirrored view.
      right.set(viewer.z, 0, -viewer.x);
    }
    return { view: forward.dot(viewer) >= 0 ? 'front' as const : 'back' as const, flip: forward.dot(right) < -.001 };
  }
  pose(dt: number, state: 'idle' | 'walk' | 'attack' | 'hit' | 'downed', progress: number, view: 'front' | 'back', flip: boolean) {
    if (state !== this.state) { this.clock = 0; this.state = state; }
    else this.clock += dt;
    const column = state === 'downed' ? 7 : state === 'hit' ? 6 : state === 'attack' ? (progress < .45 ? 4 : 5) : Math.floor(this.clock * (state === 'walk' ? 9 : 5)) % 4;
    this.frame(column, view, flip);
    this.root.userData.animation = { state, frame: column, view, flip, clock: this.clock };
    return this.bundle.atlas.sockets[`${view}:${column}`];
  }
  frame(column: number, view: 'front' | 'back', flip: boolean) {
    const row = view === 'front' ? 0 : 1; if (column === this.column && row === this.row && flip === this.flip) return;
    this.column = column; this.row = row; this.flip = flip;
    const uv = this.mesh.geometry.getAttribute('uv');
    // Half-pixel inset isolates the selected cell under linear sampling.
    const left = (column * 256 + .5) / 2048, right = ((column + 1) * 256 - .5) / 2048;
    const top = 1 - (row * 256 + .5) / 512, bottom = 1 - ((row + 1) * 256 - .5) / 512;
    uv.setXY(0, flip ? right : left, top); uv.setXY(1, flip ? left : right, top);
    uv.setXY(2, flip ? right : left, bottom); uv.setXY(3, flip ? left : right, bottom); uv.needsUpdate = true;
    if (this.weapon) this.showWeapon(this.weapon.visible, this.bundle.atlas.sockets[`${view}:${column}`]);
  }
  equipment(id: string, texture: THREE.Texture, dimensions: { width: number; height: number }, grip: { x: number; y: number }) {
    if (id === this.weaponId) return;
    this.clearWeapon(); this.weaponId = id;
    const scale = 86 / Math.max(dimensions.width, dimensions.height), w = dimensions.width * scale, h = dimensions.height * scale;
    const geometry = new THREE.PlaneGeometry(w, h); geometry.translate(w * (.5 - grip.x), h * (grip.y - .5), 0);
    this.weapon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, alphaTest: .5, depthWrite: true, depthTest: true, alphaToCoverage: true }));
    this.root.add(this.weapon);
  }
  showWeapon(visible: boolean, socket?: SpriteSocket) {
    if (!this.weapon) return; this.weapon.visible = visible && Boolean(socket); if (!socket) return;
    const anchor = this.bundle.atlas.anchor;
    this.weapon.position.set((socket.x - anchor.x) * (this.flip ? -1 : 1), anchor.y - socket.y, socket.behind ? -1 : 1);
    this.weapon.rotation.z = socket.angle * (this.flip ? -1 : 1); this.weapon.scale.x = this.flip ? -1 : 1;
  }
  private clearWeapon() { if (this.weapon) { this.weapon.removeFromParent(); this.weapon.geometry.dispose(); this.weapon.material.dispose(); this.weapon = undefined; } }
  clear() { this.clearWeapon(); this.root.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
