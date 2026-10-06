import { jobForHero, weaponFor, SUPPORT_SKILLS, ARMOR, extraGear, type ExtraSlot, type Stats } from './content';
export type Derived = {
    stats: Stats;
    statBreakdown: Record<keyof Stats,{base:number;class:number;gear:number}>;
    attack: number;
    defense: number;
    offense: number;
    toughness: number;
    damageBonus: number;
    resistance: number;
    hp: number;
    mp: number;
    move: number;
    weaponRank: number;
    spellPower: number;
    resilience: number;
};
/** Source: One Vision calculator.js steps 1–4 and formula.js scaling ids 1/7/13.
 * Authored class/base/gear values are TacticsSD content; formula ordering is source-grounded.
 */
export function derive(hero: number, level: number, gear: {
    weapon: number;
    armor: number;
} & Partial<Record<ExtraSlot,number>>, supportId = 'weapon-study'): Derived {
    const job = jobForHero(hero);
    const stats = { ...job.base };
    for (const key of Object.keys(stats) as (keyof Stats)[])
        stats[key] = 10 + job.base[key] + job.growth[key] / 10 * (level - 1);
    const statBreakdown=Object.fromEntries(Object.keys(stats).map(k=>[k,{base:10,class:stats[k as keyof Stats]-10,gear:0}])) as Derived['statBreakdown'];
    const equipment=[ARMOR[gear.armor],...extraGear(gear)];
    for(const item of equipment)for(const key of Object.keys(item.stats) as (keyof Stats)[]){stats[key]+=item.stats[key]??0;statBreakdown[key].gear+=item.stats[key]??0;}
    const support = SUPPORT_SKILLS.find(s => s.id === supportId) ?? SUPPORT_SKILLS[0];
    const rank = support.weaponRank;
    const offense = (job.scaling === 'strength' ? stats.str * 1.2 + stats.dex * .6 : job.scaling === 'dexterity' ? stats.str * .6 + stats.dex * 1.2 : (stats.dex + stats.mnd + stats.int) * .6) + rank * 4;
    return { stats, statBreakdown, attack: job.atk + weaponFor(hero, gear.weapon).bonus + equipment.reduce((n,i)=>n+(i.attack??0),0), defense: job.def + support.defense + equipment.reduce((n,item)=>n+item.defense,0), offense, toughness: stats.str * .5 + stats.vit, damageBonus: 10, resistance: equipment.reduce((n,i)=>n+(i.resistance??0),0), hp: job.hp + (level - 1) * 6 + equipment.reduce((n,i)=>n+(i.hp??0),0), mp: job.mp + equipment.reduce((n,i)=>n+(i.mp??0),0), move: Math.max(1,job.move + equipment.reduce((n,i)=>n+(i.move??0),0) + support.move), weaponRank:rank, spellPower:stats.int*1.2+stats.mnd*.6, resilience:stats.res+stats.mnd*.5 };
}
export function calculateDamage(attacker: Pick<Derived, 'offense' | 'attack' | 'damageBonus'>, defender: Pick<Derived, 'toughness' | 'defense' | 'resistance'>, multiplier = 1) { const overhead = Math.floor(Math.max(attacker.offense - defender.toughness, 0)); const modified = Math.floor(Math.max(overhead * (100 + attacker.damageBonus - defender.resistance) / 100, 0)); const total = Math.floor(Math.max(modified + attacker.attack - defender.defense, 1)); return { overhead, modified, total, final: total === 1 ? 1 : Math.floor(total * multiplier) }; }

/** OV v1.10a / v1.11d readme p7: INT1.2+MND.6 vs RES1+MND.5, half DEF.
 * Authored spell power is an ability value; neutral elemental resistance is zero. */
export function calculateSpellDamage(attacker: Derived, defender: Derived, power: number, defense = defender.defense) {
    return calculateDamage({offense:attacker.spellPower,attack:power,damageBonus:attacker.damageBonus}, {toughness:defender.resilience,defense:defense*.5,resistance:0});
}
/** Source coefficients and front/back floors are OV; side floor40 and the +70 normalization is an explicit
 * campaign rule because the supplied changelog does not define the final normalization. */
export function calculateAccuracy(attacker: Derived, defender: Derived, facing: 'front'|'side'|'back', spell=false) {
 const floor = {front:20,side:40,back:60}[facing];
 const offense = spell ? attacker.stats.mnd*1.2+attacker.stats.int*.6+attacker.stats.agi*.4 : attacker.stats.agi*1.2+attacker.stats.dex*.6+attacker.weaponRank*8;
 const evasion = spell ? defender.stats.avd*1.2+defender.stats.mnd*.6 : defender.stats.avd*1.2+defender.stats.dex*.6;
 return {offense,evasion,floor,chance:Math.floor(Math.min(100,Math.max(floor,70+floor+offense-evasion)))};
}
