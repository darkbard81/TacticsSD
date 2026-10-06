import { ElfSprites } from './elf-sprites';
import itemFrames from './assets/items.json' with {type:'json'};
import { evaluateWorldRig } from '../tools/characterRig/domain/animator';
import { weaponFor } from './content';
import generatedRig from './assets/dawn-rig.json' with {type:'json'};
import { rigSchema } from '../tools/characterRig/domain/rig';
import type { CharacterRigData, DirectionId } from '../tools/characterRig/domain/rig';
import { type Battle, type Pos, type Unit, type Command, tileAt, same, reachable, targets, commandAbility } from './domain';
export type VisualState = {
    command: Command;
    battle: Battle | null;
    cursor: Pos;
    selected: string | null;
    mode: string;
    top: boolean;
    zoom: number;
    pan: Pos;
    paused: boolean;
};
const rig = rigSchema.parse(generatedRig);
export class Renderer {
    readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private elf = new ElfSprites();
    private useSprites = true;
    private images = new Map<string, HTMLImageElement>();
    private tinted: HTMLCanvasElement[] = [];
    private sheet = new Image();
    private weapons = new Image();
    private items = new Image();
    private attacks = new Map<string, {
        start: number;
        kind: string;
    }>();
    private terrain = new Image();
    private rig: CharacterRigData = rig;
    private routes = new Map<string, {
        path: Pos[];
        start: number;
    }>();
    private previousHP = new Map<string, number>();
    private effects = new Map<string, number>();
    private animationTime = 0;
    private last = 0;
    private w = 0;
    private h = 0;
    private cell = 64;
    private ox = 0;
    private oy = 0;
    constructor(host: HTMLElement) { this.canvas = document.createElement('canvas'); this.canvas.setAttribute('aria-label', '높낮이 전술 전장'); this.canvas.setAttribute('role', 'img'); host.append(this.canvas); this.ctx = this.canvas.getContext('2d')!; this.sheet.addEventListener('load', () => this.cacheTints()); this.images.set('dawn-parts', this.sheet); this.sheet.src = new URL('./assets/dawn-parts.png', import.meta.url).href; this.items.src = new URL('./assets/items.png',import.meta.url).href; this.weapons.src = new URL('./assets/weapons.png', import.meta.url).href; this.terrain.src = new URL('./assets/terrain.png', import.meta.url).href; }
    private cacheTints() { this.tinted = [0,35,200,315,90,260].map(hue=>{const canvas=document.createElement('canvas');canvas.width=this.sheet.width;canvas.height=this.sheet.height;const ctx=canvas.getContext('2d')!;ctx.filter=`hue-rotate(${hue}deg)`;ctx.drawImage(this.sheet,0,0);return canvas;}); }
    async setRig(data: CharacterRigData, url: string, assets: Record<string, string> = {}) {
        const valid = rigSchema.parse(data), images = new Map<string, HTMLImageElement>();
        const refs = Object.values(valid.views).flatMap(view => [view.image, ...view.parts.map(p => p.replacement)]).filter(ref => Boolean(ref));
        await Promise.all(refs.map(async ref => {
            if (!ref || images.has(ref.id)) return;
            const image = new Image();
            const primary = valid.views.Front.image;
            const src = assets[ref.id] ?? assets[ref.name] ?? (ref.id === primary?.id ? url : new URL(ref.name, new URL(url, location.href)).href);
            image.src = src; await image.decode();
            if (image.naturalWidth !== ref.width || image.naturalHeight !== ref.height) throw Error(`${ref.name}: 이미지 크기가 JSON과 다릅니다.`);
            images.set(ref.id, image);
        }));
        this.rig = valid; this.images = images; this.useSprites = false;
        this.sheet = images.get(valid.views.Front.image!.id)!;
        this.cacheTints();
    }
    async restoreDefaultRig() { await this.setRig(rig,new URL('./assets/dawn-parts.png',import.meta.url).href); this.useSprites = true; }
    private drawPart(c: CanvasRenderingContext2D, part: CharacterRigData['views']['Front']['parts'][number], view: CharacterRigData['views']['Front'], hero: number) {
        const raw = this.images.get(part.replacement?.id ?? view.image?.id ?? '') ?? this.sheet;
        const source = !part.replacement && raw === this.sheet && part.id !== 'head' ? this.tinted[hero] ?? raw : raw;
        if (part.replacement) c.drawImage(source, 0, 0, source.width, source.height, 0, 0, part.rect.width, part.rect.height);
        else c.drawImage(source, part.rect.x, part.rect.y, part.rect.width, part.rect.height, 0, 0, part.rect.width, part.rect.height);
    }
    point(p: Pos, h: number, top: boolean): Pos { return top ? { x: this.ox + (p.x - 3.5) * this.cell * .78, y: this.oy + (p.y - 3.5) * this.cell * .78 } : { x: this.ox + (p.x - p.y) * this.cell * .7, y: this.oy + (p.x + p.y - 7) * this.cell * .35 - h * this.cell * .22 }; }
    pick(x: number, y: number, s: VisualState): Pos | null {
        if (!s.battle)
            return null;
        const cells = [...s.battle.tiles].sort((a, b) => (b.x + b.y) - (a.x + a.y));
        for (const t of cells) {
            const p = this.point(t, t.h, s.top);
            const dx = Math.abs(x - p.x), dy = Math.abs(y - p.y);
            if (s.top ? dx < this.cell * .39 && dy < this.cell * .39 : dx / (this.cell * .7) + dy / (this.cell * .35) < 1)
                return t;
        }
        return null;
    }
    private polygon(points: Pos[], fill: string, stroke = '#394c42') { const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
    draw(s: VisualState, now: number) {
        const dpr = window.devicePixelRatio || 1, w = window.innerWidth, h = window.innerHeight;
        this.w = w;
        this.h = h;
        if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
            this.canvas.width = Math.round(w * dpr);
            this.canvas.height = Math.round(h * dpr);
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
        }
        const dt = Math.max(0, (now - this.last) / 1000);
        this.last = now;
        if (!s.paused)
            this.animationTime += dt;
        const c = this.ctx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        if (!s.battle)
            return;
        const b = s.battle;
        this.cell = Math.min((w - 420) / (s.top ? 6.4 : 11.2) * .94, (h - (s.top ? 285 : 245)) / (s.top ? 6.4 : 5.7)) * s.zoom;
        this.ox = w * .5 + s.pan.x;
        this.oy = h * .51 - (s.top ? 20 : 0) + s.pan.y;
        const gradient = c.createRadialGradient(w * .5, h * .5, 30, w * .5, h * .5, w * .65);
        gradient.addColorStop(0, '#48635c');
        gradient.addColorStop(1, '#142b30');
        c.fillStyle = gradient;
        c.fillRect(0, 0, w, h);
        const selected = b.units.find(u => u.id === s.selected);
        const move = selected && s.mode === 'move' ? reachable(b, selected) : [];
        const targetTiles = selected && s.mode === 'target' ? targets(b, selected, s.command) : [];
        const entries = [...b.tiles.map(t => ({ depth: t.x + t.y, kind: 'tile' as const, t })), ...b.units.filter(u => u.hp > 0).map(u => ({ depth: this.visualPosition(u, b).x + this.visualPosition(u, b).y + .15, kind: 'unit' as const, u }))].sort((a, z) => a.depth - z.depth);
        for (const e of entries) {
            if (e.kind === 'unit') {
                const u = e.u;
                const current = this.visualPosition(u, b);
                const pos = this.point(current, current.h, s.top);
                const walking = current.walking;
                const lastHp = this.previousHP.get(u.id);
                if (lastHp !== undefined && u.hp < lastHp)
                    this.effects.set(u.id, this.animationTime + .4);
                this.previousHP.set(u.id, u.hp);
                this.actor(current.walking ? { ...u, facing: current.facing } : u, pos, walking, s.top, selected?.id === u.id);
                continue;
            }
            const t = e.t, p = this.point(t, t.h, s.top), cw = this.cell * .7, ch = this.cell * .35;
            const pts = s.top ? [{ x: p.x - this.cell * .39, y: p.y - this.cell * .39 }, { x: p.x + this.cell * .39, y: p.y - this.cell * .39 }, { x: p.x + this.cell * .39, y: p.y + this.cell * .39 }, { x: p.x - this.cell * .39, y: p.y + this.cell * .39 }] : [{ x: p.x, y: p.y - ch }, { x: p.x + cw, y: p.y }, { x: p.x, y: p.y + ch }, { x: p.x - cw, y: p.y }];
            if (!s.top && t.kind !== 'water') {
                for (const [i, j, neighbor] of [[1, 2, { x: t.x + 1, y: t.y }], [2, 3, { x: t.x, y: t.y + 1 }]] as const) {
                    const drop = Math.max(0, t.h - (tileAt(b, neighbor)?.h ?? -1)) * this.cell * .22;
                    if (!drop)
                        continue;
                    const a = pts[i], z = pts[j];
                    this.polygon([a, z, { x: z.x, y: z.y + drop }, { x: a.x, y: a.y + drop }], i === 1 ? '#786c52' : '#514c3b');
                    if (this.terrain.complete && this.terrain.naturalWidth) {
                        c.save();
                        c.beginPath();
                        [a, z, { x: z.x, y: z.y + drop }, { x: a.x, y: a.y + drop }].forEach((v, k) => k ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y));
                        c.clip();
                        const tw = this.terrain.naturalWidth / 2, th = this.terrain.naturalHeight / 2;
                        c.globalAlpha = .5;
                        c.drawImage(this.terrain, tw, th, tw, Math.min(th, drop * 6), Math.min(a.x, z.x), Math.min(a.y, z.y), Math.abs(z.x - a.x), drop + ch);
                        c.restore();
                    }
                }
            }
            this.polygon(pts, t.kind === 'water' ? '#34717a' : t.kind === 'stone' ? '#b5ac87' : '#75855a');
            if (this.terrain.complete && this.terrain.naturalWidth) {
                c.save();
                c.beginPath();
                pts.forEach((v, k) => k ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y));
                c.clip();
                c.globalAlpha = .78;
                const tw = this.terrain.naturalWidth / 2, th = this.terrain.naturalHeight / 2;
                const sx = t.kind === 'stone' ? tw : 0, sy = t.kind === 'water' ? th : 0;
                if (s.top)
                    c.drawImage(this.terrain, sx, sy, tw, th, pts[0].x, pts[0].y, this.cell * .78, this.cell * .78);
                else {
                    c.transform(cw / 128, ch / 128, -cw / 128, ch / 128, p.x, p.y - ch);
                    c.drawImage(this.terrain, sx, sy, tw, th, 0, 0, 128, 128);
                }
                c.restore();
            }
            if (targetTiles.some(v => same(v, t)))
                this.polygon(pts, '#ffba4655', '#ffdd8a');
            if (move.some(v => same(v, t)))
                this.polygon(pts, '#59cfcb55', '#99efdc');
            if (same(s.cursor, t)) {
                this.polygon(pts, '#f9d87a66', '#fff6c4');
                c.save();
                c.strokeStyle = '#fff1a0';
                c.lineWidth = 3;
                c.stroke();
                c.restore();
            }
            if (t.block) {
                c.fillStyle = '#ddd0a2';
                c.font = `${this.cell * .52}px serif`;
                c.textAlign = 'center';
                c.fillText('♜', p.x, p.y + 3);
            }
        }
        // Screen annotations are a final pass: later terrain must never cut names/HP.
        for (const u of b.units.filter(u => u.hp > 0)) {
            const current = this.visualPosition(u, b);
            this.label(u, this.point(current, current.h, s.top), s.top);
        }
        // Small terrain labels stay above foreground walls; standees themselves are depth-sorted.
        const cp = this.point(s.cursor, tileAt(b, s.cursor)?.h ?? 0, s.top);
        c.fillStyle = '#fff1bc';
        c.font = 'bold 12px sans-serif';
        c.textAlign = 'center';
        c.fillText(`${s.cursor.x + 1},${s.cursor.y + 1}`, cp.x, cp.y + this.cell * .5);
    }
    private actor(u: Unit, p: Pos, walking: boolean, top: boolean, selected: boolean) {
        const c = this.ctx;
        const size = this.cell * (top ? .72 : 1.65);
        c.save();
        c.translate(p.x, p.y);
        c.fillStyle = u.team === 'ally' ? '#70ded8' : '#ef9288';
        c.globalAlpha = u.done ? .35 : .85;
        c.beginPath();
        c.ellipse(0, 0, this.cell * .23, this.cell * .1, 0, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = u.done ? .65 : 1;
        if (selected) {
            c.strokeStyle = '#ffe9a0';
            c.lineWidth = 2;
            c.stroke();
        }
        const hit = (this.effects.get(u.id) ?? 0) > this.animationTime;
        if (hit)
            c.translate(Math.sin(this.animationTime * 65) * 4, 0);
        const attack = this.attacks.get(u.id);
        const progress = attack && this.animationTime >= attack.start ? Math.min(1, (this.animationTime - attack.start) / .65) : 1;
        const weapon = weaponFor(u.hero,u.weaponVariant);
        const motion = attack?.kind==='item'?'heal':attack?.kind==='skill'?commandAbility(u,'skill').animation:weapon.animation;
        if (this.useSprites && this.elf.draw(c, u.hero, u.weaponVariant, u.facing, this.animationTime, size, walking, progress, attack?.kind === 'item' ? 'item' : motion, hit ? Math.min(1, ((this.effects.get(u.id) ?? 0) - this.animationTime) / .4) : 0)) {
            c.restore(); return;
        }
        const dir: DirectionId = u.facing;
        const view = this.rig.views[this.rig.directions[dir].view];
        const scale = size / view.referenceSize * view.displayScale;
        c.scale(scale * (this.rig.directions[dir].flip ? -1 : 1), scale);
        // The evaluator already includes the body's C skew. Never project/squash the actor root.
        const actionRig = progress < 1 || weapon.family==='bow' ? structuredClone(this.rig) : this.rig;
        if (actionRig !== this.rig) {
            const arm = actionRig.views[actionRig.directions[dir].view].parts.find(p => p.id === 'armR')!;
            const other = actionRig.views[actionRig.directions[dir].view].parts.find(p=>p.id==='armL')!;
            const wave = progress<1 ? Math.sin(progress*Math.PI) : 0;
            if(weapon.family==='bow'){arm.restTransform.rotation-=.9;arm.restTransform.y-=25;other.restTransform.rotation+=.9*wave;other.restTransform.x-=50*wave;}
            if(motion==='heal'||motion==='cast'){other.restTransform.rotation+=.55*wave;other.restTransform.y-=40*wave;}
            arm.restTransform.rotation -= (motion === 'slash' ? 1.5 : motion === 'shoot' ? .65 : .45) * wave;
            if (motion === 'thrust')
                arm.restTransform.y -= 150 * wave;
        }
        const parts = evaluateWorldRig(actionRig, dir, this.animationTime, walking ? 'Walk' : 'Idle').sort((a, b) => a.zIndex - b.zIndex);
        if (this.sheet.complete && this.sheet.naturalWidth) {
            for (const pose of parts) {
                if (!pose.visible)
                    continue;
                c.globalAlpha = hit ? .55 : 1;
                const part = view.parts.find(p => p.id === pose.id)!;
                const m = pose.matrix;
                c.save();
                c.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                this.drawPart(c, part, view, u.hero);
                if (part.id === 'armR')
                    this.weapon(c, u.hero, u.weaponVariant, part.rect.width, part.rect.height, progress < 1 && motion==='shoot' ? Math.sin(progress*Math.PI) : 0);
                c.restore();
            }
        }
        c.restore();
    }
    private label(u: Unit, p: Pos, top: boolean) {
        const c = this.ctx, size = this.cell * (top ? .72 : 1.65) * (this.useSprites && this.elf.loaded ? .82 : 1);
        c.save();
        c.fillStyle = '#142b30';
        c.fillRect(p.x - 20, p.y - size - (top ? 5 : 8), 40, 5);
        c.fillStyle = u.team === 'ally' ? '#7dd3b7' : '#e8a198';
        c.fillRect(p.x - 20, p.y - size - (top ? 5 : 8), 40 * u.hp / u.maxHp, 5);
        c.font = 'bold 11px sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#fff5db';
        c.lineWidth = 3; c.strokeStyle = '#142b30'; c.strokeText(u.name, p.x, p.y + (top ? 11 : 17));
        c.fillText(u.name, p.x, p.y + (top ? 11 : 17));
        c.restore();
    }
    attack(id: string, kind: string, delay = 0) { this.attacks.set(id, { start: this.animationTime + delay, kind }); }
    private weapon(c: CanvasRenderingContext2D, job: number, variant: number, w: number, h: number, draw = 0) {
        if (!this.weapons.complete || !this.weapons.naturalWidth)
            return;
        const weapon = weaponFor(job, variant), col = weapon.frame % 4, row = Math.floor(weapon.frame / 4), cw = this.weapons.naturalWidth / 4, ch = this.weapons.naturalHeight / 2;
        const grip = weapon.grip.y;
        const scale = weapon.family === 'bow' ? .95 : weapon.family === 'sword' ? .85 : 1;
        c.save();
        c.filter = 'none';
        c.translate(w * .48, h * .88);
        c.rotate(weapon.family === 'bow' ? .75 : -.32);
        c.scale(scale, scale);
        const item=weapon.iconId?(itemFrames as Record<string,{x:number;y:number;w:number;h:number}>)[weapon.iconId]:null;
        if(item&&this.items.complete&&this.items.naturalWidth)c.drawImage(this.items,item.x,item.y,item.w,item.h,-cw*weapon.grip.x,-ch*grip,cw,ch);
        else c.drawImage(this.weapons, col * cw, row * ch, cw, ch, -cw * weapon.grip.x, -ch * grip, cw, ch);
        if(weapon.family==='bow' && draw>0){c.strokeStyle='#e9d6a3';c.lineWidth=3;c.beginPath();c.moveTo(cw*.3,-ch*.45);c.lineTo(cw*(.3+draw*.4),0);c.lineTo(cw*.3,ch*.45);c.stroke();c.strokeStyle='#e8dfc1';c.beginPath();c.moveTo(-cw*.25,0);c.lineTo(cw*(.3+draw*.4),0);c.stroke();}
        c.restore();
    }
    portraits(host: HTMLElement, gear: Array<{
        weapon: number;
    }>) {
        const draw = () => host.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]').forEach(canvas => {
            const hero = Number(canvas.dataset.portrait), ctx = canvas.getContext('2d')!, view = this.rig.views.Front;
            ctx.clearRect(0, 0, 200, 220);
            if (this.useSprites && this.elf.loaded) {
                ctx.save(); ctx.translate(100, 214);
                this.elf.draw(ctx, hero, canvas.dataset.weapon === undefined ? gear[hero].weapon : Number(canvas.dataset.weapon), 'SE', 0, 218);
                ctx.restore(); return;
            }
            ctx.save();
            ctx.translate(100, 217);
            ctx.scale(.215, .215);
            for (const pose of evaluateWorldRig(this.rig, 'Front', 0, 'Rest').sort((a, b) => a.zIndex - b.zIndex)) {
                const p = view.parts.find(p => p.id === pose.id)!, m = pose.matrix;
                ctx.save();
                ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                this.drawPart(ctx, p, view, hero);
                if (p.id === 'armR')
                    this.weapon(ctx, hero, canvas.dataset.weapon===undefined?gear[hero].weapon:Number(canvas.dataset.weapon), p.rect.width, p.rect.height);
                ctx.restore();
            }
            ctx.restore();
        });
        if (this.sheet.complete && this.sheet.naturalWidth)
            draw();
        else
            this.sheet.addEventListener('load', draw, { once: true });
        this.weapons.addEventListener('load', draw, { once: true });
        if (this.useSprites && !this.elf.loaded) void this.elf.ready.then(draw).catch(() => undefined);
    }
    move(id: string, path: Pos[]) { if (path.length < 2) {
        this.routes.delete(id);
        return;
    } this.routes.set(id, { path, start: this.animationTime }); }
    reset() { this.routes.clear(); this.attacks.clear(); this.previousHP.clear(); this.effects.clear(); }
    private visualPosition(u: Unit, b: Battle) {
        const route = this.routes.get(u.id);
        if (!route)
            return { ...u, h: tileAt(b, u)!.h, walking: false, facing: u.facing };
        const step = Math.min(route.path.length - 1, (this.animationTime - route.start) / .16), i = Math.floor(step), t = step - i, a = route.path[i], z = route.path[Math.min(i + 1, route.path.length - 1)];
        const facing: DirectionId = z.x > a.x ? 'SE' : z.x < a.x ? 'NW' : z.y > a.y ? 'SW' : z.y < a.y ? 'NE' : u.facing;
        return { facing, x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t, h: tileAt(b, a)!.h + (tileAt(b, z)!.h - tileAt(b, a)!.h) * t, walking: step < route.path.length - 1 };
    }
    get dimensions() { return { width: this.w, height: this.h, backingWidth: this.canvas.width, backingHeight: this.canvas.height, dpr: window.devicePixelRatio }; }
}
