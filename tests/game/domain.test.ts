import { describe, it, expect } from 'vitest';
import { makeBattle, newCampaign, reachable, tileAt, act, damage, targets, enemyTurn, reward, parseCampaign, encodeCampaign, pathTo, finishTurn, moveUnit, accuracy, activateGuard, type Unit } from '../../game/domain';
import { derive, calculateDamage } from '../../game/calculation';
import { CLASSES, ABILITIES, validateContent } from '../../game/content';
import { Edges, padActions, defaults, bind, loadBindings } from '../../game/input';
import { rigSchema } from '../../tools/characterRig/domain/rig';
import { evaluateWorldRig } from '../../tools/characterRig/domain/animator';
import generated from '../../game/assets/dawn-rig.json';
describe('rules', () => {
    it('player equipment never alters enemy equipment or movement', () => {
        const c = newCampaign(), original = makeBattle(0, c);
        c.gear.forEach(g => { g.weapon = 1; g.armor = 1; });
        const equipped = makeBattle(0, c);
        expect(equipped.units.filter(u => u.team === 'enemy')).toEqual(original.units.filter(u => u.team === 'enemy'));
        expect(equipped.units[0].atk).toBe(original.units[0].atk + 5);
        expect(equipped.units[0].move).toBe(original.units[0].move - 1);
    });
    it('BFS excludes water, occupied cells, walls and excessive steps', () => {
        const b = makeBattle(0, newCampaign()), u = b.units[0];
        for (const p of reachable(b, u)) {
            expect(tileAt(b, p)?.kind).not.toBe('water');
            expect(tileAt(b, p)?.block).toBe(false);
        }
        expect(reachable(b, u)).not.toContainEqual({ x: 1, y: 3 });
        expect(reachable(b, u)).not.toContainEqual({ x: 7, y: 1 });
    });
    it('damage preview, MP and committed HP agree', () => { const b = makeBattle(0, newCampaign()), u = b.units[2], t = b.units[3]; b.activeId = u.id; u.mp = 36; u.x = 4; u.y = 3; t.facing = 'SE'; const n = damage(b, u, t, 'skill'), hp = t.hp, mp = u.mp; expect(act(b, u, t, 'skill')).toBe(true); expect(t.hp).toBe(Math.max(0, hp - n)); expect(u.mp).toBe(mp - 12); expect(act(b, u, t, 'skill')).toBe(false); });
    it('unreachable / empty-MP / zero inventory actions do not mutate', () => { const b = makeBattle(0, newCampaign()), u = b.units[0], t = b.units[3], old = JSON.stringify(b); expect(act(b, u, t, 'attack')).toBe(false); expect(JSON.stringify(b)).toBe(old); u.tp = 0; expect(targets(b, u, 'skill')).toEqual([]); b.potions = 0; expect(targets(b, u, 'item')).toEqual([]); });
    it('healing caps HP and consumes one leaf', () => { const b = makeBattle(0, newCampaign()), u = b.units[0]; u.hp -= 5; expect(damage(b, u, u, 'item')).toBe(5); act(b, u, u, 'item'); expect(u.hp).toBe(u.maxHp); expect(b.potions).toBe(2); });
    it('RT is individual, waiting is cheaper, and active enemy advances exactly once', () => { const b = makeBattle(0, newCampaign()), first = b.units[0]; finishTurn(b); expect(first.readyAt).toBe(90); expect(b.activeId).toBe('a1'); finishTurn(b); finishTurn(b); expect(b.phase).toBe('enemy'); const turn = b.round; enemyTurn(b); expect(b.round).toBe(turn + 1); });
    it('move and act work in either order, direction changes accuracy not damage', () => { const b = makeBattle(0, newCampaign()), u = b.units[0], t = b.units[3]; t.x = 2; t.y = 2; t.facing = 'SE'; const hit = damage(b, u, t, 'attack'); expect(act(b, u, t, 'attack')).toBe(true); expect(moveUnit(b, u, { x: 1, y: 1 })).toHaveLength(2); expect(moveUnit(b, u, { x: 0, y: 1 })).toEqual([]); t.facing = 'NW'; expect(damage(b, u, t, 'attack')).toBe(hit); expect(accuracy(b, u, t, 'attack')).toBeLessThan(100); });
    it('MP/TP start zero, global time restores both; activated skill has its own allowance', () => {
        const b = makeBattle(0, newCampaign()), u = b.units[0];
        expect(u.mp).toBe(0);
        expect(u.tp).toBe(0);
        u.tp = 20;
        expect(activateGuard(b, u)).toBe(true);
        expect(u.acted).toBe(false);
        expect(activateGuard(b, u)).toBe(false);
        const t = b.units[3];
        t.x = 2;
        t.y = 2;
        expect(act(b, u, t, 'attack')).toBe(true);
        for (let i = 0; i < 4; i++)
            finishTurn(b);
        expect(b.clock).toBeGreaterThanOrEqual(20);
        expect(u.mp).toBeGreaterThan(0);
    });
    it('paths stay on passable cells and saves use stable content IDs', () => {
        const c = newCampaign(), b = makeBattle(0, c), u = b.units[0];
        const path = pathTo(b, u, { x: 4, y: 3 });
        expect(path[0]).toEqual({ x: 1, y: 2 });
        for (const p of path)
            expect(tileAt(b, p)?.kind).not.toBe('water');
        const disk = JSON.parse(encodeCampaign(c));
        expect(disk.party).toEqual(['erin', 'rowan', 'sera']);
        expect(disk.equipment.erin.weaponId).toBe('sword-field');
        expect(parseCampaign(JSON.stringify(disk))).toEqual(c);
    });
    it('reward is idempotent and saves reject invalid input', () => { const c = newCampaign(); reward(c, 0); reward(c, 0); expect(c.gold).toBe(250); expect(c.unlocked).toBe(1); expect(parseCampaign(JSON.stringify(c))).toEqual(c); expect(parseCampaign('{')).toBeNull(); expect(parseCampaign(JSON.stringify({ ...c, party: [0, 0] }))).toBeNull(); });
});
describe('calculation source regression and extensibility', () => {
    it('uses published floor/max order and critical multiplier', () => { const a = { offense: 70.9, attack: 44, damageBonus: 13 }, d = { toughness: 52.1, defense: 15, resistance: 7 }; expect(calculateDamage(a, d, 1.5)).toEqual({ overhead: 18, modified: 19, total: 48, final: 72 }); expect(calculateDamage({ ...a, offense: 0, attack: 0 }, d, 1.5).final).toBe(1); });
    it('base + class + per-ten-level growth and scaling match source', () => { const a = derive(0, 1, { weapon: 0, armor: 0 }), z = derive(0, 11, { weapon: 1, armor: 1 }); expect(a.stats.str).toBe(25); expect(a.offense).toBeCloseTo(25 * 1.2 + 22 * .6 + 4); expect(z.stats.str - a.stats.str).toBe(10); expect(z.attack - a.attack).toBe(5); expect(z.defense - a.defense).toBe(4); expect(z.move - a.move).toBe(-1); });
    it('new class and ability validate without UI switch changes', () => { const a = { ...ABILITIES[0], id: 'test-lancer', name: '창 돌격', range: 2 }; const c = { ...CLASSES[0], id: 'lancer', abilityId: a.id }; expect(() => validateContent([...CLASSES, c], [...ABILITIES, a])).not.toThrow(); expect(() => validateContent([...CLASSES, { ...c, abilityId: 'missing' }], ABILITIES)).toThrow(); });
});
describe('input adapters', () => {
    it('confirm edges once, arrows repeat after delay, release clears', () => { const e = new Edges(); expect(e.sample(new Set(['confirm', 'right']), 0)).toEqual(['right', 'confirm']); expect(e.sample(new Set(['confirm', 'right']), 100)).toEqual([]); expect(e.sample(new Set(['confirm', 'right']), 350)).toEqual(['right']); e.sample(new Set(), 400); expect(e.sample(new Set(['confirm']), 410)).toEqual(['confirm']); });
    it('deadzone and standard buttons map to semantic actions', () => { const p = { connected: true, index: 0, mapping: 'standard', buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })), axes: [.29, -.5, 0, .8] }; expect([...padActions(p, defaults())]).toEqual(['confirm', 'up', 'cameraDown']); });
    it('remapping swaps conflicts, preserves escape and rejects corrupt save', () => { const b = defaults(); bind(b, 'keys', 'confirm', 'ArrowUp'); expect(b.keys.up).toBe('Enter'); expect(b.keys.cancel).toBe('Escape'); expect(loadBindings(JSON.stringify(b))).toEqual(b); expect(loadBindings('bad')).toEqual(defaults()); });
});
describe('generated rig', () => {
    const rig = rigSchema.parse(generated);
    it('validates 12 unique front/back crops and C projection once', () => { expect(new Set(Object.values(rig.views).flatMap(v => v.parts.map(p => `${p.rect.x},${p.rect.y}`))).size).toBe(12); const body = evaluateWorldRig(rig, 'SE', 0, 'Rest').find(p => p.id === 'body')!; expect(body.matrix.a).toBeCloseTo(Math.SQRT1_2); expect(body.matrix.b).toBeCloseTo(Math.SQRT1_2 * .5); expect(body.matrix.c).toBeCloseTo(0); expect(body.matrix.d).toBeCloseTo(1); });
    it('walk loops and moves feet; Idle is distinct from Rest', () => { const a = evaluateWorldRig(rig, 'NW', 0, 'Walk'), b = evaluateWorldRig(rig, 'NW', rig.motion.duration, 'Walk'), c = evaluateWorldRig(rig, 'NW', .2, 'Walk'); expect(a).toEqual(b); expect(a.find(p => p.id === 'legL')!.matrix).not.toEqual(c.find(p => p.id === 'legL')!.matrix); });
    it('all directions retain finite transforms', () => {
        for (const dir of ['SE', 'SW', 'NE', 'NW'] as const)
            for (const mode of ['Rest', 'Idle', 'Walk'] as const)
                for (const p of evaluateWorldRig(rig, dir, .17, mode))
                    expect(Object.values(p.matrix).every(Number.isFinite)).toBe(true);
    });
});
// Type-level contract consumed by a content extension.
const _unit: Pick<Unit, 'classId' | 'abilityId'> = { classId: 'knight', abilityId: 'dawn-strike' };
void _unit;
