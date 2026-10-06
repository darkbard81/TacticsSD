import atlas from './assets/elf-sd-sheet-v2/frames.json' with { type: 'json' };
import itemFrames from './assets/items.json' with { type: 'json' };
import { classSpriteFor, CLASS_SPRITE_URLS } from './class-sprites';
import classSockets from './assets/classes/sockets.json' with { type: 'json' };
import { weaponFor } from './content';
import type { DirectionId } from '../tools/characterRig/domain/rig';

export const ELF_STATES = ['idle', 'walk', 'hurt', 'jump', 'collapse', 'common_attack', 'item'] as const;
export type ElfState = typeof ELF_STATES[number];
export type ElfFrame = { state: ElfState; frame: number };
type Socket = { hand: number[]; behind: boolean };
export const ELF_ANCHOR = { x: 128, y: 230, cell: 256 };
const poses = new Map(atlas.frames.map(frame => [frame.id, frame]));
export function elfDirection(direction: DirectionId) {
    return { view: direction === 'NE' || direction === 'NW' || direction === 'Back' ? 'back' as const : 'front' as const, flip: direction === 'SW' || direction === 'NW' };
}
export function elfPose(direction: DirectionId, pose: ElfFrame) {
    const sequence = atlas.sequences[elfDirection(direction).view][pose.state];
    return poses.get(sequence[Math.max(0, Math.min(sequence.length - 1, pose.frame))])!;
}
export function elfFrame(time: number, walking: boolean, progress: number, motion: string, hurt: number): ElfFrame {
    const at = (state: ElfState, phase: number): ElfFrame => ({ state, frame: Math.min(atlas.sequences.front[state].length - 1, Math.floor(Math.max(0, phase) * atlas.sequences.front[state].length)) });
    if (hurt > 0) return at('hurt', 1 - hurt);
    if (progress < 1) return at(motion === 'item' ? 'item' : motion === 'jump' ? 'jump' : motion === 'collapse' ? 'collapse' : 'common_attack', progress);
    // Presentation clock only: waiting uses a relaxed walk loop without changing simulation.
    return { state: 'walk', frame: Math.floor(Math.max(0, time) * (walking ? 9 : 5)) % 4 };
}
// One hand per painted pose, in cell pixels. Mirroring is inherited by body and gear together.
const hands: Record<'front' | 'back', Record<string, number[]>> = {
    front: { idle: [99, 158], walk_right: [86, 158], walk_left: [143, 132], hurt: [181, 112], jump1: [84, 203], jump2: [92, 137], jump3: [91, 60], collapse: [188, 218], attack1: [157, 106], attack2: [106, 49], attack3: [211, 109], attack4: [174, 187], attack5: [100, 135] },
    back: { idle: [102, 157], walk_right: [72, 157], walk_left: [139, 133], hurt: [159, 119], jump1: [80, 194], jump2: [89, 131], jump3: [154, 32], collapse: [185, 215], attack1: [157, 115], attack2: [106, 48], attack3: [209, 108], attack4: [181, 180], attack5: [105, 132] },
};
export function elfSocket(direction: DirectionId, pose: ElfFrame, hero?: number): Socket {
    const { view } = elfDirection(direction), semantic = elfPose(direction, pose).semantic;
    const authored = hero === undefined ? hands : (classSockets as Record<string, typeof hands>)[classSpriteFor(hero)];
    return { hand: authored[view][semantic], behind: view === 'back' && ['idle', 'walk_right', 'attack5'].includes(semantic) };
}
export function elfWeaponAngle(pose: ElfFrame, motion: string) {
    if (pose.state === 'common_attack') {
        if (motion === 'cast' || motion === 'heal') return [-.35, -.2, -.6, .3, .8, -.25, -.35][pose.frame];
        return [-.35, -.55, -1.2, Math.PI / 2, 2.4, -.4, -.35][pose.frame];
    }
    if (pose.state === 'walk') return [-.35, -.65, -.35, -.4][pose.frame];
    return -.35;
}

/** Whole painted body frames. Equipment remains independently swappable at authored sockets. */
export class ElfSprites {
    private sheets = new Map<string, HTMLImageElement>();
    private weapons = new Image();
    private items = new Image();
    private weaponCache = new Map<string, HTMLCanvasElement>();
    readonly ready: Promise<void>;
    loaded = false;
    constructor() {
        for (const [id, url] of Object.entries(CLASS_SPRITE_URLS)) {
            const sheet = new Image(); sheet.src = url; this.sheets.set(id, sheet);
        }
        this.weapons.src = new URL('./assets/weapons.png', import.meta.url).href;
        this.items.src = new URL('./assets/items.png', import.meta.url).href;
        this.ready = Promise.all([...this.sheets.values(), this.weapons, this.items].map(image => image.decode())).then(() => {
            this.loaded = true;
        });
        // A failed asset still leaves the existing rig available; no unhandled rejection.
        void this.ready.catch(() => undefined);
    }
    sheetFor(hero: number) { return this.sheets.get(classSpriteFor(hero))!; }
    private weaponImage(hero: number, variant: number) {
        const weapon = weaponFor(hero, variant);
        let c = this.weaponCache.get(weapon.id);
        if (c) return c;
        c = document.createElement('canvas'); c.width = 256; c.height = 512;
        const ctx = c.getContext('2d')!;
        const item = weapon.iconId ? (itemFrames as Record<string, { x: number; y: number; w: number; h: number }>)[weapon.iconId] : null;
        if (item) ctx.drawImage(this.items, item.x, item.y, item.w, item.h, 0, 0, 256, 512);
        else ctx.drawImage(this.weapons, weapon.frame % 4 * this.weapons.width / 4, Math.floor(weapon.frame / 4) * this.weapons.height / 2, this.weapons.width / 4, this.weapons.height / 2, 0, 0, 256, 512);
        this.weaponCache.set(weapon.id, c); return c;
    }
    draw(c: CanvasRenderingContext2D, hero: number, variant: number, direction: DirectionId, time: number, size: number, walking = false, progress = 1, motion = '', hurt = 0) {
        if (!this.loaded) return false;
        const { flip } = elfDirection(direction), pose = elfFrame(time, walking, progress, motion, hurt), socket = elfSocket(direction, pose, hero);
        const sheet = this.sheetFor(hero), { rect } = elfPose(direction, pose);
        const attacking = pose.state === 'common_attack';
        const weapon = weaponFor(hero, variant), bow = weapon.family === 'bow';
        c.save(); c.scale((flip ? -1 : 1) * size / 256, size / 256); c.translate(-ELF_ANCHOR.x, -ELF_ANCHOR.y);
        const body = () => c.drawImage(sheet, rect.x, rect.y, rect.w, rect.h, 0, 0, 256, 256);
        const equipment = () => {
            const [hx, hy] = socket.hand;
            c.save(); c.translate(hx, hy);
            const img = this.weaponImage(hero, variant);
            const height = bow ? 150 : weapon.family === 'sword' ? 155 : 170;
            const width = height / 2;
            c.rotate(bow ? (attacking && motion === 'shoot' ? 0 : -.22) : elfWeaponAngle(pose, motion));
            // Bow curvature points along the shot, while the string is on the archer's side.
            if (bow) c.scale(-1, 1);
            c.drawImage(img, -width * weapon.grip.x, -height * weapon.grip.y, width, height);
            c.restore();
            // The shared attack3 is the forward release. Keep later recovery poses free
            // of arrows that would otherwise jump back with the changing hand position.
            if (bow && attacking && motion === 'shoot' && pose.frame === 3) {
                const travel = Math.max(0, progress - 3 / 7) * 650;
                c.strokeStyle = '#e4d7aa'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx + travel, hy); c.lineTo(hx + 43 + travel, hy); c.stroke();
                c.fillStyle = '#c6e2de'; c.beginPath(); c.moveTo(hx + 49 + travel, hy); c.lineTo(hx + 39 + travel, hy - 4); c.lineTo(hx + 39 + travel, hy + 4); c.fill();
            }
        };
        if (socket.behind) { equipment(); body(); } else { body(); equipment(); }
        // Repaint just the opaque glove over the shaft. No terrain masking or whole-actor see-through.
        const [hx, hy] = socket.hand;
        c.save(); c.beginPath(); c.ellipse(hx, hy, 7, 7, 0, 0, Math.PI * 2); c.clip(); body(); c.restore();
        if ((motion === 'cast' || motion === 'heal' || motion === 'item') && progress < 1) {
            c.save(); c.globalAlpha *= Math.sin(progress * Math.PI) * .8; c.strokeStyle = motion !== 'cast' ? '#fff4b0' : '#9feaff'; c.lineWidth = 2.5;
            c.beginPath(); c.arc(hx, hy - 28, 12 + progress * 16, 0, Math.PI * 2); c.stroke(); c.restore();
        }
        c.restore(); return true;
    }
}
