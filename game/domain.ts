import {inventoryFor,validateInventory} from './shop';
import { z } from 'zod';
import { ROSTER, jobForHero, abilityById, weaponFor, WEAPONS, CLASS_ABILITIES, SUPPORT_SKILLS, CONSUMABLES, EXTRA_GEAR, ARMOR, type ExtraSlot, type Ability } from './content';
import { derive, calculateDamage, calculateSpellDamage, calculateAccuracy, type Derived } from './calculation';
export type Pos = {
    x: number;
    y: number;
};
export const SIZE = 8;
export const JOBS = ROSTER.map((_, i) => { const c = jobForHero(i), a = abilityById(c.abilityId); return { ...c, skill: a.name, cost: a.cost, resource: a.resource }; });
export const HEROES = ROSTER.map(h => h.name);
export const STAGES = [{ name: '갈대의 관문', sub: 'THE REED GATE', desc: '강을 건너는 옛 길을 되찾으세요.', reward: 150 }, { name: '무너진 별의 다리', sub: 'THE FALLEN BRIDGE', desc: '고지대를 지키는 파수대를 돌파하세요.', reward: 200 }, { name: '은빛 성채', sub: 'THE SILVER CITADEL', desc: '성채의 봉인을 풀고 섬에 여명을 돌려주세요.', reward: 300 }];
export const gearSchema = z.object({ weapon: z.number().int().min(0).max(WEAPONS.length-1), armor: z.number().int().min(0).max(ARMOR.length-1), offhand:z.number().int().min(0).max(EXTRA_GEAR.offhand.length-1).optional(), armguard:z.number().int().min(0).max(EXTRA_GEAR.armguard.length-1).optional(), accessory:z.number().int().min(0).max(EXTRA_GEAR.accessory.length-1).optional() });
export const campaignSchema = z.object({ version: z.literal(1), inventory:z.record(z.string(),z.number().int().min(0).max(999)).optional(), unlocked: z.number().int().min(0).max(3), gold: z.number().int().min(0).max(99999), party: z.array(z.number().int().min(0).max(ROSTER.length - 1)).min(1).max(3).refine(a => new Set(a).size === a.length), gear: z.array(gearSchema).length(ROSTER.length), cleared: z.array(z.number().int().min(0).max(2)).max(3).refine(a => new Set(a).size === a.length), levels: z.record(z.string(),z.number().int().min(1).max(10)).default({}), training:z.record(z.string(),z.object({sp:z.number().int().nonnegative(), learned:z.array(z.string()), abilityId:z.string(), supportId:z.string()})).default({}) });
export type Campaign = z.infer<typeof campaignSchema>;
export const newCampaign = (): Campaign => ({ version: 1, unlocked: 0, gold: 100, party: [0, 1, 2], gear: Array.from({ length: ROSTER.length }, () => ({ weapon: 0, armor: 0 })), cleared: [], levels:{}, training:{} });
export function parseCampaign(raw: string | null): Campaign | null {
    try {
        const v = JSON.parse(raw ?? '');
        if (v.version === 2) {
            const disk = z.object({ version: z.literal(2), unlocked: z.number(), gold: z.number(), cleared: z.array(z.number()), party: z.array(z.string()), equipment: z.record(z.string(), z.object({ weaponId: z.string(), armorId: z.string(), offhandId:z.string().optional(), armguardId:z.string().optional(), accessoryId:z.string().optional() })) }).parse(v);
            const party = disk.party.map(id => ROSTER.findIndex(r => r.id === id));
            const gear = ROSTER.map((r, i) => {
                const equipment = disk.equipment[r.id];
                if (!equipment) throw Error('Incomplete current-format equipment');
                const w = WEAPONS.find(w => w.id === equipment.weaponId);
                if (!w || w.family !== jobForHero(i).weaponFamily)
                    throw Error('Unknown equipment reference');
                const extras:Partial<Record<ExtraSlot,number>>={};for(const slot of ['offhand','armguard','accessory'] as const){const id=equipment[`${slot}Id`];if(id!==undefined){const n=EXTRA_GEAR[slot].findIndex(item=>item.id===id);if(n<0)throw Error('Unknown equipment reference');extras[slot]=n;}}
                const armor=ARMOR.findIndex(a=>a.id===equipment.armorId);if(armor<0)throw Error('Unknown armor');return { weapon: WEAPONS.filter(x=>x.family===w.family).indexOf(w), armor, ...extras };
            });
            return validateCampaign(campaignSchema.parse({ ...disk, version: 1, party, gear, levels:v.levels??{}, training:v.training??{},inventory:v.inventory }));
        }
        return null;
    }
    catch {
        return null;
    }
}
export type Tile = Pos & {
    h: number;
    kind: 'grass' | 'stone' | 'water';
    block: boolean;
};
export type Unit = Pos & {
    id: string;
    hero: number;
    weaponVariant: number;
    itemId: string;
    classId: string;
    abilityId: string;
    derived: Derived;
    name: string;
    job: number;
    team: 'ally' | 'enemy';
    hp: number;
    maxHp: number;
    mp: number;
    tp: number;
    readyAt: number;
    baseRT: number;
    moved: boolean;
    acted: boolean;
    skillUsed: boolean;
    skillRT: number;
    moveRT: number;
    actionRT: number;
    atk: number;
    def: number;
    move: number;
    range: number;
    jump: number;
    done: boolean;
    guard: boolean;
    facing: 'SE' | 'SW' | 'NE' | 'NW';
};
export type Battle = {
    stage: number;
    tiles: Tile[];
    units: Unit[];
    round: number;
    clock: number;
    rng: number;
    activeId: string;
    phase: 'ally' | 'enemy' | 'won' | 'lost';
    potions: number;
    inventory: Record<string,number>;
    log: string[];
};
export const distance = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
export const tileAt = (b: Battle, p: Pos) => b.tiles.find(t => same(t, p));
export const unitAt = (b: Battle, p: Pos) => b.units.find(u => u.hp > 0 && same(u, p));
export function makeBattle(stage: number, c: Campaign): Battle {
    const tiles: Tile[] = Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8); const water = x === 3 && y !== 3 && y !== 4; return { x, y, h: water ? 0 : 1 + (x > 4 && y < 5 ? 1 : 0) + (stage === 2 && x > 5 && y < 3 ? 1 : 0) + (stage===1&&x>4&&y>4?1:0), kind: water ? 'water' : x === 3 || y === 3 || y === 4 ? 'stone' : 'grass', block: (x === 0 && y === 0) || (x === 7 && y === 7) || (stage===1 && ((x===5&&y===1)||(x===6&&y===6))) || (stage===2 && x===4 && (y===0||y===7)) }; });
    const make = (hero: number, x: number, y: number, enemy = false, index = hero): Unit => { const j = JOBS[hero], g = enemy ? { weapon: 0, armor: 0 } : c.gear[hero], d = derive(hero, enemy ? stage + 1 : classLevel(c,hero), g, enemy ? 'weapon-study' : trainingFor(c,hero).supportId); return { id: enemy ? 'e' + index : 'a' + hero, hero, weaponVariant: enemy ? 0 : g.weapon, itemId:'mend-leaf', classId: j.id, abilityId: enemy ? j.abilityId : trainingFor(c,hero).abilityId, derived: d, name: enemy ? ['잿빛 기사', '그늘 궁수', '황혼 마녀', '성채 수호자'][index] : HEROES[hero], job: hero, team: enemy ? 'enemy' : 'ally', x, y, hp: enemy ? 55 + stage * 10 : d.hp, maxHp: enemy ? 55 + stage * 10 : d.hp, mp: 0, tp: 0, readyAt: enemy ? 35 + index * 5 : c.party.indexOf(hero) * 5, baseRT: j.baseRT, moved: false, acted: false, skillUsed: false, skillRT: 0, moveRT: 0, actionRT: 0, atk: enemy ? 16 + stage * 2 : d.attack, def: enemy ? 4 + stage : d.defense, move: d.move, range: j.range, jump: j.jump, done: false, guard: false, facing: enemy ? 'SW' : 'SE' }; };
    return { stage, tiles, units: [...c.party.map((h, i) => make(h, 1, 2 + i)), make(0, 5, 3, true, 0), make(1, 6, 2, true, 1), make(2, 6, 5, true, 2), ...(stage === 2 ? [make(0, 7, 1, true, 3)] : [])], round: 1, clock: 0, rng: 117 + stage, activeId: 'a' + c.party[0], phase: 'ally', potions: inventoryFor(c)['mend-leaf']??0, inventory:Object.fromEntries(CONSUMABLES.map(i=>[i.abilityId,inventoryFor(c)[i.abilityId]??0])), log: ['은빛 여명 원정대 · 모든 적을 쓰러뜨리세요.'] };
}
export function reachable(b: Battle, u: Unit): Pos[] {
    const q = [{ x: u.x, y: u.y, d: 0 }], seen = new Set([u.x + ',' + u.y]);
    const result: Pos[] = [];
    while (q.length) {
        const p = q.shift()!;
        result.push({ x: p.x, y: p.y });
        if (p.d >= u.move)
            continue;
        for (const n of [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }]) {
            const t = tileAt(b, n), from = tileAt(b, p)!;
            if (!t || t.kind === 'water' || t.block || Math.abs(t.h - from.h) > u.jump || unitAt(b, n) || seen.has(n.x + ',' + n.y))
                continue;
            seen.add(n.x + ',' + n.y);
            q.push({ ...n, d: p.d + 1 });
        }
    }
    return result;
}
export function hasSight(b: Battle, a: Pos, t: Pos) {
    const steps = Math.max(Math.abs(t.x - a.x), Math.abs(t.y - a.y));
    for (let i = 1; i < steps; i++) {
        const p = { x: Math.round(a.x + (t.x - a.x) * i / steps), y: Math.round(a.y + (t.y - a.y) * i / steps) };
        const tile = tileAt(b, p);
        if (tile?.block || tile && tile.h > Math.max(tileAt(b, a)!.h, tileAt(b, t)!.h) + 1)
            return false;
    }
    return true;
}
export type Command = 'attack' | 'skill' | 'item';
export function commandAbility(u: Unit, cmd: Command): Ability {
    if (cmd === 'item')
        return abilityById(u.itemId ?? 'mend-leaf');
    if (cmd === 'skill')
        return abilityById(u.abilityId);
    return { id: 'weapon-attack', name: '무기 공격', description: '장착 무기로 공격합니다.', cost: 0, resource: 'mp', range: u.range, radius: 0, target: 'enemy', effect: 'damage', power: 0, formula:'weapon', percent:0, animation: jobForHero(u.hero).weaponFamily === 'bow' ? 'shoot' : 'slash' };
}
const matchesTarget=(u:Unit,t:Unit,a:Ability)=>a.target==='enemy'?t.team!==u.team:t.team===u.team&&(a.target!=='wounded-ally'||t.hp<t.maxHp)&&(a.effect!=='mp'||t.mp<t.derived.mp)&&(a.effect!=='tp'||t.tp<100);
export const itemStock=(b:Battle,u:Unit)=>u.itemId==='mend-leaf'?b.potions:b.inventory[u.itemId]??0;
export function targets(b: Battle, u: Unit, cmd: Command): Unit[] {
    const a = commandAbility(u, cmd);
    if (u[a.resource] < a.cost || cmd === 'item' && itemStock(b,u) === 0)
        return [];
    return b.units.filter(t => t.hp > 0 && matchesTarget(u,t,a) && distance(u, t) <= a.range + (a.animation === 'shoot' ? Math.max(0, tileAt(b, u)!.h - tileAt(b, t)!.h) : 0) && hasSight(b, u, t));
}
export function damage(_b: Battle, u: Unit, t: Unit, cmd: Command) {
    const a = commandAbility(u, cmd);
    if(a.effect==='guard') return 8;
    if(a.effect==='mp')return Math.min(t.derived.mp-t.mp,a.power+Math.floor(t.derived.mp*a.percent/100));
    if(a.effect==='tp')return Math.min(100-t.tp,a.power+a.percent);
    if (a.effect === 'heal')
        return Math.min(t.maxHp - t.hp, a.power+Math.floor(t.maxHp*a.percent/100));
    if (a.formula === 'spell') return calculateSpellDamage(u.derived,t.derived,a.power,t.def+(t.guard?8:0)).final;
    return calculateDamage({ ...u.derived, attack: u.atk + a.power }, { ...t.derived, defense: t.def + (t.guard ? 8 : 0) }, 1).final;
}
/** OV stat coefficients, campaign normalization: see CALCULATION.md. */
export function accuracy(_b: Battle, u: Unit, t: Unit, cmd: Command) {
    if (commandAbility(u, cmd).effect !== 'damage')
        return 100;
    const delta = { SE: { x: 1, y: 0 }, NW: { x: -1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 } }[t.facing];
    const dot = (u.x - t.x) * delta.x + (u.y - t.y) * delta.y;
    return calculateAccuracy(u.derived,t.derived,dot<0?'back':dot===0?'side':'front',commandAbility(u,cmd).formula==='spell').chance;
}
function roll(b: Battle) { b.rng = (Math.imul(b.rng, 1664525) + 1013904223) >>> 0; return b.rng % 100; }
export function activateGuard(b: Battle, u: Unit) {
    if (u.id !== b.activeId || u.skillUsed || u.tp < 8)
        return false;
    u.tp -= 8;
    u.skillUsed = true;
    u.skillRT = 15;
    u.guard = true;
    b.log.push(u.name + ' · 결의: 다음 AT까지 방어 +8');
    return true;
}
export const EFFECTS: Record<Ability['effect'], (target: Unit, amount: number) => void> = { damage: (t, n) => { t.hp = Math.max(0, t.hp - n); }, heal: (t, n) => { t.hp = Math.min(t.maxHp, t.hp + n); }, guard: t=>{t.guard=true;}, mp:(t,n)=>{t.mp=Math.min(t.derived.mp,t.mp+n);}, tp:(t,n)=>{t.tp=Math.min(100,t.tp+n);} };
export function checkOutcome(b: Battle) {
    if (!b.units.some(u => u.team === 'enemy' && u.hp > 0))
        b.phase = 'won';
    else if (!b.units.some(u => u.team === 'ally' && u.hp > 0))
        b.phase = 'lost';
}
export function face(u: Unit, p: Pos) { u.facing = Math.abs(p.x - u.x) >= Math.abs(p.y - u.y) ? p.x >= u.x ? 'SE' : 'NW' : p.y >= u.y ? 'SW' : 'NE'; }
export function affectedTargets(b: Battle, u: Unit, t: Unit, cmd: Command): Unit[] {
    const a = commandAbility(u, cmd);
    return a.radius > 0 ? b.units.filter(v => v.hp > 0 && matchesTarget(u,v,a) && distance(v, t) <= a.radius) : [t];
}
export function act(b: Battle, u: Unit, t: Unit, cmd: Command) {
    if (u.id !== b.activeId || u.acted || u.hp <= 0 || !targets(b, u, cmd).some(x => x.id === t.id))
        return false;
    const ability = commandAbility(u, cmd);
    const beneficial = ability.effect !== 'damage';
    face(u, t);
    const victims = affectedTargets(b, u, t, cmd);
    const damaged: Unit[] = [];
    for (const v of victims) {
        const n = damage(b, u, v, cmd);
        if (!beneficial && roll(b) >= accuracy(b, u, v, cmd)) {
            b.log.push(`${u.name} → ${v.name} · 빗나감`);
            continue;
        }
        const beforeHP = v.hp;
        EFFECTS[ability.effect](v, n);
        if (v.hp < beforeHP) damaged.push(v);
        b.log.push(`${u.name} → ${v.name} · ${ability.effect==='heal'?'회복':ability.effect==='guard'?'방어 강화':ability.effect==='mp'?'MP 회복':ability.effect==='tp'?'TP 회복':'피해'} ${n}`);
    }
    u[ability.resource] -= ability.cost;
    if (damaged.length) {
        u.tp = Math.min(100, u.tp + 6);
        for (const v of damaged)
            v.tp = Math.min(100, v.tp + 4);
    }
    u.acted = true;
    u.actionRT = cmd === 'skill' ? 30 : cmd === 'item' ? 20 : 25;
    if (cmd === 'item') {b.inventory[u.itemId]--;if(u.itemId==='mend-leaf')b.potions--;}
    checkOutcome(b);
    return true;
}
/** Authored PSP-inspired RT costs, not a claim of exact original values. */
export const activeUnit = (b: Battle) => b.units.find(u => u.id === b.activeId)!;
export const turnOrder = (b: Battle) => b.units.filter(u => u.hp > 0).sort((a, z) => a.readyAt - z.readyAt || a.id.localeCompare(z.id));
export function moveUnit(b: Battle, u: Unit, destination: Pos) {
    if (u.id !== b.activeId || u.moved || u.hp <= 0)
        return [];
    const path = pathTo(b, u, destination);
    if (path.length < 2)
        return [];
    face(u, destination);
    u.x = destination.x;
    u.y = destination.y;
    u.moved = true;
    u.moveRT = (path.length - 1) * 4;
    return path;
}
export function finishTurn(b: Battle) {
    checkOutcome(b);
    if (b.phase === 'won' || b.phase === 'lost')
        return;
    const u = activeUnit(b);
    u.readyAt = b.clock + u.baseRT + u.moveRT + u.actionRT + u.skillRT;
    u.done = true;
    const next = turnOrder(b)[0];
    const elapsed = next.readyAt - b.clock;
    b.clock = next.readyAt;
    // Global-clock MP recovery retains fractional remainder through floor differences.
    const oldClock = b.clock - elapsed;
    const regen = Math.floor(b.clock / 20) - Math.floor(oldClock / 20);
    for (const v of b.units)
        if (v.hp > 0) {
            v.mp = Math.min(JOBS[v.job].mp, v.mp + regen);
            v.tp = Math.min(100, v.tp + regen);
        }
    b.activeId = next.id;
    b.phase = next.team;
    b.round++;
    next.moved = false;
    next.acted = false;
    next.skillUsed = false;
    next.skillRT = 0;
    next.moveRT = 0;
    next.actionRT = 0;
    next.done = false;
    next.guard = false;
    checkOutcome(b);
}
export function enemyTurn(b: Battle) {
    if (b.phase !== 'enemy')
        return;
    const u = activeUnit(b);
    let route: Pos[] = [];
    let ts = targets(b, u, 'attack');
    if (!ts.length) {
        const allies = b.units.filter(v => v.team === 'ally' && v.hp > 0);
        if (allies.length) {
            const p = reachable(b, u).sort((a, z) => Math.min(...allies.map(v => distance(a, v))) - Math.min(...allies.map(v => distance(z, v))))[0];
            route = moveUnit(b, u, p);
            ts = targets(b, u, 'attack');
        }
    }
    const target = ts.sort((a, z) => a.hp - z.hp)[0];
    if (target)
        act(b, u, target, 'attack');
    else
        u.guard = true;
    const trace = { id: u.id, path: route, attacked: Boolean(target) };
    finishTurn(b);
    b.log = b.log.slice(-20);
    return trace;
}
export function reward(c: Campaign, stage: number) {
    if (!c.cleared.includes(stage)) {
        c.cleared.push(stage);
        c.gold = Math.min(99999,c.gold+STAGES[stage].reward);
        for (const id of new Set(c.party.map(h=>jobForHero(h).id))) c.levels[id]=Math.min(10,(c.levels[id]??1)+1);
        for (const hero of c.party) trainingFor(c,hero).sp += 12;
        c.unlocked = Math.max(c.unlocked, stage + 1);
    }
}
export function pathTo(b: Battle, u: Unit, target: Pos): Pos[] {
    const queue: Pos[][] = [[{ x: u.x, y: u.y }]], seen = new Set([u.x + ',' + u.y]);
    while (queue.length) {
        const path = queue.shift()!, p = path.at(-1)!;
        if (same(p, target))
            return path;
        if (path.length > u.move)
            continue;
        for (const n of [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }]) {
            const t = tileAt(b, n);
            if (!t || t.kind === 'water' || t.block || Math.abs(t.h - tileAt(b, p)!.h) > u.jump || unitAt(b, n) || seen.has(n.x + ',' + n.y))
                continue;
            seen.add(n.x + ',' + n.y);
            queue.push([...path, n]);
        }
    }
    return [];
}
/** Persist stable roster/weapon IDs, independent of menu order. Only current version 2 is accepted on load. */
export function encodeCampaign(c: Campaign) { return JSON.stringify({ version: 2, unlocked: c.unlocked, gold: c.gold, inventory:c.inventory, cleared: c.cleared, levels:c.levels, training:c.training, party: c.party.map(i => ROSTER[i].id), equipment: Object.fromEntries(ROSTER.map((r, i) => [r.id, { weaponId: weaponFor(i, c.gear[i].weapon).id, armorId: ARMOR[c.gear[i].armor].id, ...Object.fromEntries((['offhand','armguard','accessory'] as const).filter(slot=>c.gear[i][slot]!==undefined).map(slot=>[slot+'Id',EXTRA_GEAR[slot][c.gear[i][slot]!].id])) }])) }); }

export const classLevel=(c:Campaign,hero:number)=>c.levels[jobForHero(hero).id]??1;
export function trainingFor(c:Campaign,hero:number) {
 const job=jobForHero(hero), id=ROSTER[hero].id;
 return c.training[id]??(c.training[id]={sp:8,learned:[job.abilityId],abilityId:job.abilityId,supportId:'weapon-study'});
}
export function learnAbility(c:Campaign,hero:number,id:string) {
 const training=trainingFor(c,hero),allowed=CLASS_ABILITIES[jobForHero(hero).id]??[jobForHero(hero).abilityId];
 if(!allowed.includes(id))return false;
 if(!training.learned.includes(id)){if(training.sp<8)return false;training.sp-=8;training.learned.push(id);}
 training.abilityId=id;return true;
}
export function equipSupport(c:Campaign,hero:number,id:string) {if(!SUPPORT_SKILLS.some(s=>s.id===id))return false;trainingFor(c,hero).supportId=id;return true;}

function validateCampaign(c:Campaign):Campaign {
 for(let i=0;i<c.gear.length;i++)if(!weaponFor(i,c.gear[i].weapon))throw Error("Unknown weapon variant");
 validateInventory(c);
 for(const hero of ROSTER){const t=c.training[hero.id];if(!t)continue;const job=jobForHero(ROSTER.indexOf(hero));const allowed=CLASS_ABILITIES[job.id]??[job.abilityId];if(!t.learned.includes(t.abilityId)||t.learned.some(id=>!allowed.includes(id))||!SUPPORT_SKILLS.some(s=>s.id===t.supportId))throw Error('Unknown training reference');}
 return c;
}
