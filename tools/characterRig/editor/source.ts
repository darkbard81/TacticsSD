import { clamp, updateGeometry, type Part, type RigView } from '../domain/rig';
import { type Asset } from '../runtime/assets';
const NS = 'http://www.w3.org/2000/svg';
const make = (name: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
type Drag = { action: string; startX: number; startY: number; rect: Part['rect']; pivot: Part['pivot']; socket: Part['pivot']; panX: number; panY: number };
export class SourceEditor {
  readonly svg = make('svg', { role: 'img', 'aria-label': '원본 이미지 파츠 편집. 방향키로 선택 영역 이동, Shift로 10픽셀 이동.', tabindex: 0 }) as SVGSVGElement;
  private view!: RigView;
  private selected = 'head';
  private asset?: Asset;
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  private scale = 1;
  private origin = { x: 0, y: 0 };
  private drag: Drag | null = null;
  tool = 'select';
  private abort = new AbortController();
  private observer: ResizeObserver;
  constructor(private host: HTMLElement, private changed: (finished: boolean) => void, private select: (id: string) => void) {
    this.host.append(this.svg);
    const signal = this.abort.signal;
    this.svg.addEventListener('pointerdown', this.down, { signal });
    this.svg.addEventListener('pointermove', this.move, { signal });
    this.svg.addEventListener('pointerup', this.up, { signal });
    this.svg.addEventListener('pointercancel', this.up, { signal });
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const p = this.point(e.clientX, e.clientY), bounds = this.svg.getBoundingClientRect();
      this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.001), 0.2, 8);
      this.geometry(); this.pan.x += e.clientX - bounds.left - this.origin.x - p.x * this.scale; this.pan.y += e.clientY - bounds.top - this.origin.y - p.y * this.scale; this.draw();
    }, { signal, passive: false });
    this.svg.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || !this.view) return;
      e.preventDefault(); const p = this.part(), n = e.shiftKey ? 10 : 1;
      const rect = { ...p.rect, x: clamp(p.rect.x + (e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0), 0, this.view.width - p.rect.width), y: clamp(p.rect.y + (e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0), 0, this.view.height - p.rect.height) };
      updateGeometry(p, rect, p.pivot); this.changed(true);
    }, { signal });
    this.observer = new ResizeObserver(() => this.draw()); this.observer.observe(host);
  }
  sync(view: RigView, selected: string, asset?: Asset) { this.view = view; this.selected = selected; this.asset = asset; this.draw(); }
  fit() { this.zoom = 1; this.pan = { x: 0, y: 0 }; this.draw(); }
  zoomBy(factor: number) { this.zoom = clamp(this.zoom * factor, 0.2, 8); this.draw(); }
  private geometry() {
    this.scale = Math.min((this.host.clientWidth - 40) / this.view.width, (this.host.clientHeight - 40) / this.view.height) * this.zoom;
    this.origin = { x: (this.host.clientWidth - this.view.width * this.scale) / 2 + this.pan.x, y: (this.host.clientHeight - this.view.height * this.scale) / 2 + this.pan.y };
  }
  private point(x: number, y: number) { const b = this.svg.getBoundingClientRect(); return { x: (x - b.left - this.origin.x) / this.scale, y: (y - b.top - this.origin.y) / this.scale }; }
  private part() { return this.view.parts.find(p => p.id === this.selected)!; }
  private down = (e: PointerEvent) => {
    if (!this.view) return;
    const target = e.target as SVGElement;
    if (target.dataset.part && this.tool === 'select') { this.selected = target.dataset.part; this.select(this.selected); }
    const point = this.point(e.clientX, e.clientY), p = this.part();
    const action = e.button === 1 || e.altKey || this.tool === 'pan' ? 'pan' : this.tool === 'draw' ? 'draw' : target.dataset.action;
    if (!action) return;
    e.preventDefault(); this.svg.focus(); this.svg.setPointerCapture(e.pointerId);
    this.drag = { action, startX: point.x, startY: point.y, rect: { ...p.rect }, pivot: { ...p.pivot }, socket: { ...p.attachment.socket }, panX: this.pan.x, panY: this.pan.y };
  };
  private move = (e: PointerEvent) => {
    const drag = this.drag; if (!drag) return;
    const at = this.point(e.clientX, e.clientY), dx = at.x - drag.startX, dy = at.y - drag.startY, p = this.part();
    if (drag.action === 'pan') { this.pan.x += dx * this.scale; this.pan.y += dy * this.scale; this.draw(); return; }
    if (drag.action === 'socket') {
      p.attachment.socket = { x: clamp(drag.socket.x + dx, -100000, 100000), y: clamp(drag.socket.y + dy, -100000, 100000) };
      this.changed(false); return;
    }
    let rect = { ...drag.rect }, pivot = { ...drag.pivot };
    if (drag.action === 'move') { rect.x = clamp(drag.rect.x + dx, 0, this.view.width - rect.width); rect.y = clamp(drag.rect.y + dy, 0, this.view.height - rect.height); }
    else if (drag.action === 'pivot') { pivot.x = clamp(drag.pivot.x + dx, 0, rect.width); pivot.y = clamp(drag.pivot.y + dy, 0, rect.height); }
    else {
      let x1 = rect.x, y1 = rect.y, x2 = rect.x + rect.width, y2 = rect.y + rect.height;
      if (drag.action === 'draw') { x1 = clamp(Math.min(drag.startX, at.x), 0, this.view.width - 1); y1 = clamp(Math.min(drag.startY, at.y), 0, this.view.height - 1); x2 = clamp(Math.max(drag.startX, at.x), x1 + 1, this.view.width); y2 = clamp(Math.max(drag.startY, at.y), y1 + 1, this.view.height); }
      else {
        if (drag.action.includes('w')) x1 = clamp(drag.rect.x + dx, 0, x2 - 1);
        if (drag.action.includes('e')) x2 = clamp(drag.rect.x + drag.rect.width + dx, x1 + 1, this.view.width);
        if (drag.action.includes('n')) y1 = clamp(drag.rect.y + dy, 0, y2 - 1);
        if (drag.action.includes('s')) y2 = clamp(drag.rect.y + drag.rect.height + dy, y1 + 1, this.view.height);
      }
      rect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      pivot = { x: clamp(drag.pivot.x, 0, rect.width), y: clamp(drag.pivot.y, 0, rect.height) };
    }
    updateGeometry(p, rect, pivot); this.changed(false);
  };
  private up = (e: PointerEvent) => { if (this.drag) { const panOnly = this.drag.action === 'pan'; this.drag = null; if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId); if (!panOnly) this.changed(true); } };
  draw() {
    if (!this.view) return; this.geometry(); this.svg.replaceChildren();
    this.svg.setAttribute('viewBox', `0 0 ${this.host.clientWidth} ${this.host.clientHeight}`);
    const group = make('g', { transform: `translate(${this.origin.x} ${this.origin.y}) scale(${this.scale})` });
    this.svg.append(group);
    group.append(make('rect', { width: this.view.width, height: this.view.height, fill: 'none', stroke: '#52636d', 'stroke-width': 1 / this.scale }));
    if (this.asset) group.append(make('image', { href: this.asset.url, width: this.view.width, height: this.view.height, 'pointer-events': 'none' }));
    for (const part of [...this.view.parts].sort((a, b) => Number(a.id === this.selected) - Number(b.id === this.selected))) {
      const active = part.id === this.selected;
      group.append(make('rect', { ...part.rect, fill: active ? '#66ddbf0a' : 'transparent', stroke: active ? '#72f2cc' : '#6c8e9866', 'stroke-width': (active ? 2 : 1) / this.scale, 'data-part': part.id, 'data-action': 'move', cursor: 'move' }));
    }
    const p = this.part(), r = p.rect, s = 8 / this.scale;
    for (const [corner, x, y] of [['nw', r.x, r.y], ['ne', r.x + r.width, r.y], ['sw', r.x, r.y + r.height], ['se', r.x + r.width, r.y + r.height]] as const) group.append(make('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: '#72f2cc', 'data-action': corner, cursor: `${corner}-resize` }));
    group.append(make('circle', { cx: r.x + p.pivot.x, cy: r.y + p.pivot.y, r: 6 / this.scale, fill: '#edbc77', stroke: '#10191d', 'stroke-width': 2 / this.scale, 'data-action': 'pivot', cursor: 'crosshair' }));
    const parent = this.view.parts.find(part => part.id === p.attachment.parentId);
    const socketOrigin = parent?.rect ?? this.view.ground;
    const socketX = socketOrigin.x + p.attachment.socket.x, socketY = socketOrigin.y + p.attachment.socket.y;
    group.append(make('circle', { cx:socketX, cy:socketY, r:6/this.scale, fill:'#c59bff', stroke:'#10191d', 'stroke-width':2/this.scale, 'data-action':'socket', cursor:'crosshair' }));
    const label = make('text', { x:socketX+10/this.scale, y:socketY-8/this.scale, fill:'#d5b5ff', 'font-size':11/this.scale, 'pointer-events':'none' });
    label.textContent = parent ? `${parent.id} → ${p.id}` : `지면 → ${p.id}`; group.append(label);
    group.append(make('line', { x1: 0, x2: this.view.width, y1: this.view.ground.y, y2: this.view.ground.y, stroke: '#edbc77', 'stroke-width': 1 / this.scale, 'stroke-dasharray': `${5 / this.scale} ${4 / this.scale}`, 'pointer-events': 'none' }));
    group.append(make('circle', { cx: this.view.ground.x, cy: this.view.ground.y, r: 4 / this.scale, fill: '#edbc77', 'pointer-events': 'none' }));
  }
  destroy() { this.abort.abort(); this.observer.disconnect(); this.svg.remove(); }
}
