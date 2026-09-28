import { Application, Container, Graphics, Rectangle, RenderLayer, Sprite, Texture, type Ticker } from 'pixi.js';
import { evaluateRig } from '../domain/animator';
import { type CharacterRigData, type DirectionId, type Mode } from '../domain/rig';
import { RigAssets } from './assets';
type Node = { root: Container; layer: RenderLayer; parts: Map<string, { pivot: Container; socket: Container; sprite?: Sprite; texture?: Texture }>; direction: DirectionId };
export class PixiRigRenderer {
  readonly app = new Application();
  private nodes: Node[] = [];
  private guide = new Graphics();
  private observer?: ResizeObserver;
  private rig!: CharacterRigData;
  private assets!: RigAssets;
  private dirs: DirectionId[] = [];
  private solo: string | null = null;
  private disposed = false;
  private initialized = false;
  private readonly tick = (ticker: Ticker) => this.onFrame(ticker.elapsedMS / 1000);
  constructor(private host: HTMLElement, private onFrame: (deltaSeconds: number) => void) {}
  async init() {
    await this.app.init({ width: this.host.clientWidth, height: this.host.clientHeight, antialias: true, backgroundAlpha: 0, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    this.initialized = true;
    if (this.disposed) { this.app.destroy({ removeView: true }, { children: true }); return; }
    this.app.canvas.setAttribute('aria-label', '재조합 캐릭터 실시간 미리보기');
    this.app.canvas.setAttribute('role', 'img');
    this.host.append(this.app.canvas); this.app.stage.addChild(this.guide);
    this.observer = new ResizeObserver(() => {
      this.app.renderer.resize(Math.max(1, this.host.clientWidth), Math.max(1, this.host.clientHeight));
      this.layout();
    });
    this.observer.observe(this.host);
    this.app.ticker.add(this.tick); this.app.start();
  }
  clear() {
    for (const node of this.nodes) {
      node.layer.detachAll();
      for (const p of node.parts.values()) p.texture?.destroy(false);
      node.root.destroy({ children: true });
    }
    this.nodes = [];
  }
  sync(rig: CharacterRigData, assets: RigAssets, dirs: DirectionId[], solo: string | null) {
    this.clear(); this.rig = rig; this.assets = assets; this.dirs = dirs; this.solo = solo;
    for (const direction of dirs) {
      const view = rig.views[rig.directions[direction].view];
      const root = new Container();
      const layer = new RenderLayer({ sortableChildren: true });
      this.app.stage.addChild(root);
      const node: Node = { root, layer, parts: new Map(), direction };
      // Keep transform nodes even when images are missing or hidden: children still inherit them.
      for (const part of view.parts) {
        const socket = new Container({ label: `${part.id}Socket` });
        socket.position.set(part.attachment.socket.x, part.attachment.socket.y);
        const pivot = new Container({ label: part.id });
        pivot.pivot.set(part.pivot.x, part.pivot.y); socket.addChild(pivot);
        node.parts.set(part.id, { pivot, socket });
      }
      for (const part of view.parts) {
        const entry = node.parts.get(part.id)!;
        const parent = part.attachment.parentId ? node.parts.get(part.attachment.parentId)!.pivot : root;
        parent.addChild(entry.socket);
        const asset = assets.get(part.replacement?.id ?? view.image?.id);
        if (!asset) continue;
        const texture = new Texture({ source: asset.texture.source, frame: part.replacement ? new Rectangle(0, 0, asset.ref.width, asset.ref.height) : new Rectangle(part.rect.x, part.rect.y, part.rect.width, part.rect.height) });
        const sprite = new Sprite(texture);
        if (part.replacement) { sprite.width = part.rect.width; sprite.height = part.rect.height; }
        entry.pivot.addChild(sprite); entry.sprite = sprite; entry.texture = texture;
        layer.attach(sprite);
      }
      root.addChild(layer);
      this.nodes.push(node);
    }
    this.layout();
  }
  private layout() {
    if (!this.rig) return;
    const w = this.app.screen.width, h = this.app.screen.height;
    const cols = this.dirs.length === 4 ? 2 : 1, rows = this.dirs.length === 4 ? 2 : 1;
    this.guide.clear();
    this.nodes.forEach((node, i) => {
      const view = this.rig.views[this.rig.directions[node.direction].view];
      const cw = w / cols, ch = h / rows, x = (i % cols + 0.5) * cw, y = (Math.floor(i / cols) + 0.86) * ch;
      // Fixed virtual 1254-unit reference space, with per-view normalization and display scale.
      const fit = Math.min(cw * 0.7 / 1254, ch * 0.76 / 1254);
      const scale = fit * 1254 / view.referenceSize * view.displayScale;
      node.root.position.set(x, y);
      node.root.scale.set(scale * (this.rig.directions[node.direction].flip ? -1 : 1), scale);
      this.guide.moveTo(x - cw * 0.38, y).lineTo(x + cw * 0.38, y).stroke({ color: 0x41606a, alpha: 0.8, width: 1 });
      const dx = cw * 0.2, dy = dx * 0.5;
      this.guide.poly([x, y - dy, x + dx, y, x, y + dy, x - dx, y]).stroke({ color: 0x497f7b, alpha: 0.5, width: 1 });
      this.guide.circle(x, y, 3).fill(0x64ddc2);
    });
  }
  render(seconds: number, mode: Mode) {
    if (this.disposed || !this.rig) return;
    for (const node of this.nodes) {
      for (const pose of evaluateRig(this.rig, node.direction, seconds, mode)) {
        const part = node.parts.get(pose.id); if (!part) continue;
        part.pivot.position.set(pose.x, pose.y); part.pivot.scale.set(pose.scaleX, pose.scaleY);
        part.pivot.rotation = pose.rotation; part.pivot.skew.set(pose.skewX, pose.skewY);
        if (part.sprite) {
          part.sprite.zIndex = pose.zIndex;
          part.sprite.visible = pose.visible && (!this.solo || this.solo === pose.id);
        }
      }
    }
  }
  diagnostics() {
    return { listeners: this.app.ticker.count, assets: this.assets?.count ?? 0, nodes: this.nodes.length,
      sprites: this.nodes.reduce((count, n) => count + [...n.parts.values()].filter(p=>p.sprite).length, 0),
      poses: this.nodes.map(n => ({ direction: n.direction, x:n.root.x, y:n.root.y, scaleX:n.root.scale.x, scaleY:n.root.scale.y,
        parts: [...n.parts].map(([id,p]) => {
          const world = n.root.toLocal(p.pivot.toGlobal(p.pivot.pivot));
          const socketWorld = n.root.toLocal(p.socket.toGlobal({x:0,y:0}));
          return { id, x:p.pivot.x, y:p.pivot.y, scaleX:p.pivot.scale.x, scaleY:p.pivot.scale.y, rotation:p.pivot.rotation,
            parentId:p.socket.parent === n.root ? null : p.socket.parent?.label,
            worldX:world.x, worldY:world.y, socketWorldX:socketWorld.x, socketWorldY:socketWorld.y,
            zIndex:p.sprite?.zIndex ?? 0, visible:p.sprite?.visible ?? false,
            frame:p.texture ? {x:p.texture.frame.x,y:p.texture.frame.y,width:p.texture.frame.width,height:p.texture.frame.height} : null };
        }) })),
    };
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    if (!this.initialized) return;
    this.observer?.disconnect(); this.app.ticker.remove(this.tick); this.clear();
    this.app.destroy({ removeView: true }, { children: true });
  }
}
