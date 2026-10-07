import * as THREE from 'three';
import registry from './assets/terrain-painted/registry.json';
import type { Battle, Tile } from './domain';
import { buildStandeePanel } from '../tools/characterRig/runtime/standee';
import { identity, type Part } from '../tools/characterRig/domain/rig';

const materialIds = ['reed-grass', 'reed-loam', 'highland-grass', 'highland-scrub', 'citadel-moss', 'sandstone', 'limestone', 'river'] as const;
const propIds = ['broadleaf-tree', 'pine-tree', 'dead-tree', 'fern-shrub', 'golden-shrub', 'mossy-boulder', 'pale-boulder', 'stump'] as const;
const files = import.meta.glob(['./assets/terrain-painted/*-top.png', './assets/terrain-painted/*-side.png', './assets/terrain-painted/props/*.png', '!./assets/terrain-painted/props/props-source.png'], { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const H = .32;
/** Presentation only. The domain tiles, collision, cover, saves and units are untouched. */
export class PaintedTerrain {
  private tops: THREE.MeshBasicMaterial[] = [];
  private sides: THREE.MeshBasicMaterial[][] = [];
  private images = new Map<string, HTMLImageElement>();
  private props: THREE.Group[] = [];
  private waterSide?: HTMLImageElement;
  private waterFoam?: HTMLImageElement;
  private waterDrops = new Map<number, THREE.MeshBasicMaterial[]>();
  ready: Promise<void>;
  constructor() {
    const loader = new THREE.TextureLoader();
    const texture = (path: string) => {
      const map = loader.load(files['./assets/terrain-painted/' + path]); map.colorSpace = THREE.SRGBColorSpace;
      map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; return map;
    };
    for (const id of materialIds) {
      this.tops.push(new THREE.MeshBasicMaterial({ map: texture(id + '-top.png') }));
      const map = texture(id + '-side.png');
      // Baked crevice shading: no extra scene lights or ambient occlusion.
      this.sides.push(['#f6eedb', '#a8ab99', '#999e8d', '#afb09e'].map(color => new THREE.MeshBasicMaterial({ map, color, side: THREE.DoubleSide })));
    }
    const loadWater = (path: string, assign: (image: HTMLImageElement) => void) => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => { assign(image); resolve(); }; image.onerror = reject; image.src = files['./assets/terrain-painted/' + path]; });
    this.ready = Promise.all([...propIds.map(id => new Promise<void>((resolve, reject) => {
      const image = new Image(); image.onload = () => { this.images.set(id, image); resolve(); }; image.onerror = reject;
      image.src = files['./assets/terrain-painted/props/' + id + '.png'];
    })), loadWater('river-side.png', image => { this.waterSide = image; }), loadWater('river-base-side.png', image => { this.waterFoam = image; })]).then(() => undefined);
  }
  /** Material-only native-pixel crop and base foam; geometry and tile ownership unchanged. */
  private waterDrop(length: number, face: number) {
    if (!this.waterSide || !this.waterFoam) return this.sides[7][face];
    let materials = this.waterDrops.get(length);
    if (!materials) {
      const source = this.waterSide, foam = this.waterFoam;
      const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
      const context = canvas.getContext('2d')!; context.drawImage(source, 0, 0);
      // Same fixed-density top crop as UVs; foam follows the base of the visible cut.
      const visiblePixels = Math.round(length * source.width);
      const band = document.createElement('canvas'); band.width = foam.width; band.height = foam.height;
      const brush = band.getContext('2d')!; brush.drawImage(foam, 0, 0); brush.globalCompositeOperation = 'destination-in';
      const fade = brush.createLinearGradient(0, 0, 0, 8); fade.addColorStop(0, 'transparent'); fade.addColorStop(1, 'white'); brush.fillStyle = fade; brush.fillRect(0, 0, band.width, band.height);
      context.drawImage(band, 0, visiblePixels - band.height);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      materials = ['#f6eedb', '#a8ab99', '#999e8d', '#afb09e'].map(color => new THREE.MeshBasicMaterial({ map, color, side: THREE.DoubleSide }));
      this.waterDrops.set(length, materials);
    }
    return materials[face];
  }
  private material(t: Tile, stage: number) {
    const variant = (t.x * 7 + t.y * 11) % 3 === 0;
    return t.kind === 'water' ? 7 : t.kind === 'stone' ? stage === 2 ? 6 : 5 : stage === 0 ? variant ? 1 : 0 : stage === 1 ? variant ? 3 : 2 : variant ? 0 : 4;
  }
  build(b: Battle, ground: THREE.Group): THREE.Mesh[] {
    this.props = [];
    const pick: THREE.Mesh[] = [];
    for (const t of b.tiles) {
      const index = this.material(t, b.stage), y = t.h * H;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.tops[index]);
      top.rotation.x = -Math.PI / 2; top.position.set(t.x, y, t.y); top.userData.tile = { x: t.x, y: t.y }; ground.add(top); pick.push(top);
      // Four directions: only height exposed above the immediate neighbour exists.
      const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1]];
      dirs.forEach(([dx, dz], face) => {
        const neighbour = b.tiles.find(n => n.x === t.x + dx && n.y === t.y + dz);
        const bottom = neighbour ? neighbour.h * H : -H, length = y - bottom;
        if (length <= 0) return;
        const geometry = new THREE.PlaneGeometry(1, length), uv = geometry.getAttribute('uv');
        // Dedicated 1:4.5 source: crop down FROM THE TOP at constant texel density.
        for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (1 - uv.getY(i)) * length / registry.materials[index].sideAspect);
        const wall = new THREE.Mesh(geometry, t.kind === 'water' ? this.waterDrop(length, face) : this.sides[index][face]);
        wall.position.set(t.x + dx * .5, (y + bottom) / 2, t.y + dz * .5);
        wall.rotation.y = dx ? dx * Math.PI / 2 : dz < 0 ? Math.PI : 0;
        wall.userData.tile = { x: t.x, y: t.y }; ground.add(wall); pick.push(wall);
      });
      // Subtle surface grid, no wireframe seams splitting the continuous cliff.
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 0, -.5), new THREE.Vector3(.5, 0, .5), new THREE.Vector3(-.5, 0, .5),
      ]), new THREE.LineBasicMaterial({ color: '#6b7457', transparent: true, opacity: .22 }));
      edge.position.set(t.x, y + .004, t.y); ground.add(edge);
      if (t.block) this.prop(ground, t, b.stage === 0 ? t.x === 0 ? 'broadleaf-tree' : 'mossy-boulder' : b.stage === 1 ? t.x === 0 ? 'pine-tree' : t.x === 7 ? 'dead-tree' : 'pale-boulder' : t.x === 0 ? 'dead-tree' : 'pale-boulder', 0, 0, true);
      // Small peripheral ornaments occupy tile margins, no new blocked cells.
      else if (t.kind === 'grass' && ((t.x === 0 && [1, 6].includes(t.y)) || (t.x === 7 && [0, 6].includes(t.y)) || (t.x === 4 && t.y === 7))) {
        const id = b.stage === 0 ? t.y === 6 ? 'stump' : 'fern-shrub' : b.stage === 1 ? 'golden-shrub' : t.y === 6 ? 'stump' : 'fern-shrub';
        this.prop(ground, t, id, t.x === 0 ? -.33 : .32, .25, false);
      }
    }
    return pick;
  }
  private prop(ground: THREE.Group, t: Tile, id: string, x: number, z: number, blocked: boolean) {
    const image = this.images.get(id); if (!image) return;
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d')!.drawImage(image, 0, 0);
    const part: Part = { id: 'prop', rect: { x: 0, y: 0, width: image.width, height: image.height }, pivot: { x: image.width / 2, y: image.height - 8 }, attachment: { parentId: null, socket: { x: 0, y: 0 } }, restTransform: identity(), visible: true, zIndex: 0 };
    const group = buildStandeePanel(canvas, undefined, part).group;
    group.traverse(o => { o.userData.prop = true; });
    const size = blocked ? id.includes('tree') ? 1.42 : .62 : .24;
    group.scale.set(size / image.height, size / image.height, .02); group.rotation.y = Math.PI / 4;
    const anchor = new THREE.Group(); anchor.position.set(t.x + x, t.h * H + .01, t.y + z); anchor.add(group); ground.add(anchor); this.props.push(group);
    group.userData.topSize = blocked ? .72 : .22; group.userData.isoSize = size; group.userData.imageHeight = image.height;
  }
  view(top: boolean) {
    for (const group of this.props) {
      const size = top ? group.userData.topSize : group.userData.isoSize, scale = size / group.userData.imageHeight;
      group.scale.set(scale, scale, .02); group.rotation.set(top ? -Math.PI / 2 : 0, top ? 0 : Math.PI / 4, 0);
      group.position.z = top ? size / 2 : 0;
    }
  }
}

