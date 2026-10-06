import sourceItems from './source-items.json' with {type:'json'};
import { z } from 'zod';
const id = z.string().regex(/^[a-z][a-z0-9.-]+$/);
export const statsSchema = z.object({ str: z.number(), vit: z.number(), dex: z.number(), int: z.number(), mnd: z.number(), res: z.number(), agi: z.number(), avd: z.number() });
export type Stats = z.infer<typeof statsSchema>;
export const abilitySchema = z.object({ id, name: z.string(), description: z.string(), cost: z.number().nonnegative(), resource: z.enum(['mp', 'tp']), range: z.number().int().positive(), radius: z.number().int().nonnegative(), target: z.enum(['enemy', 'wounded-ally', 'ally']), effect: z.enum(['damage', 'heal', 'guard', 'mp', 'tp']), power: z.number(), formula: z.enum(['weapon','spell','fixed']).default('weapon'), animation: z.enum(['slash', 'shoot', 'cast', 'heal']), percent:z.number().default(0) });
export const ABILITIES = abilitySchema.array().parse([
    { id: 'dawn-strike', name: '여명 강타', description: '무기의 힘을 모아 단일 적에게 강타합니다.', cost: 8, resource: 'tp', range: 2, radius: 0, target: 'enemy', effect: 'damage', power: 13, animation: 'slash' },
    { id: 'piercing-shot', name: '관통 사격', description: '멀리 있는 적에게 강화 사격합니다.', cost: 8, resource: 'tp', range: 4, radius: 0, target: 'enemy', effect: 'damage', power: 13, animation: 'shoot' },
    { id: 'starburst', name: '별빛 폭발', description: '대상과 인접한 적들에게 별빛 피해를 줍니다.', cost: 12, resource: 'mp', range: 3, radius: 1, target: 'enemy', effect: 'damage', power: 13, formula: 'spell', animation: 'cast' },
    { id: 'dawn-heal', name: '회복의 빛', description: '아군 한 명의 HP를 44 회복합니다.', cost: 10, resource: 'mp', range: 3, radius: 0, target: 'wounded-ally', effect: 'heal', power: 44, animation: 'heal' },
    { id: 'rally-aegis', name:'수호의 진', description:'선택한 아군과 인접 아군에게 다음 AT까지 방어 +8을 부여합니다.',cost:8,resource:'tp',range:3,radius:1,target:'ally',effect:'guard',power:8,formula:'fixed',animation:'heal'},
    { id: 'circle-of-dawn', name: '여명의 원', description: '선택한 아군과 인접 아군의 HP를 28 회복합니다.', cost: 12, resource: 'mp', range: 3, radius: 1, target: 'wounded-ally', effect: 'heal', power: 28, formula: 'fixed', animation: 'heal' },
    { id: 'moon-bolt', name: '달빛 화살', description: '정신 능력과 상대 RES에 따라 마법 피해를 줍니다.', cost: 7, resource: 'mp', range: 4, radius: 0, target: 'enemy', effect: 'damage', power: 17, formula: 'spell', animation: 'cast' },
    { id:'aether-draught',name:'마력의 물',description:'아군 MP를 12 회복합니다.',cost:0,resource:'mp',range:2,radius:0,target:'ally',effect:'mp',power:12,formula:'fixed',animation:'heal'},
    { id:'valor-draught',name:'용기의 물',description:'아군 TP를 12 회복합니다.',cost:0,resource:'mp',range:2,radius:0,target:'ally',effect:'tp',power:12,formula:'fixed',animation:'heal'},
    { id: 'mend-leaf', name: '치유의 잎', description: '치유의 잎 하나로 HP를 38 회복합니다.', cost: 0, resource: 'mp', range: 2, radius: 0, target: 'wounded-ally', effect: 'heal', power: 38, animation: 'heal' },
]);
export const CONSUMABLES=[{abilityId:'mend-leaf',icon:'♧',stock:3},{abilityId:'aether-draught',icon:'◈',stock:1},{abilityId:'valor-draught',icon:'✺',stock:1}];
export type Ability = z.infer<typeof abilitySchema>;
export const SKILLS = [{ id: 'blade-training', name: '검술 수련', weaponRank: 1 }, { id: 'bow-training', name: '궁술 수련', weaponRank: 1 }, { id: 'focus-training', name: '정신 집중', weaponRank: 1 }];
export const SUPPORT_SKILLS = [{id:'weapon-study',name:'무기 수련',description:'무기 숙련 1랭크 · 피해/명중 보정',weaponRank:1,defense:0,move:0}, {id:'fleet-foot',name:'경쾌한 발걸음',description:'이동 +1 · 무기 숙련 보정 없음',weaponRank:0,defense:0,move:1}, {id:'iron-will',name:'강철의 의지',description:'방어 +4 · 무기 숙련 보정 없음',weaponRank:0,defense:4,move:0}];
export const classSchema = z.object({ id, name: z.string(), icon: z.string(), baseRT: z.number().positive(), hp: z.number().positive(), mp: z.number().nonnegative(), atk: z.number(), def: z.number(), move: z.number().int().positive(), range: z.number().int().positive(), jump: z.number().int().positive(), abilityId: id, skillId: id, weaponFamily: z.enum(['sword', 'bow', 'arcane', 'sun']), scaling: z.enum(['strength', 'dexterity', 'focus']), base: statsSchema, growth: statsSchema });
const base = (str: number, vit: number, dex: number, int: number, mnd: number, res: number) => ({ str, vit, dex, int, mnd, res, agi: dex, avd: vit });
export const CLASSES = classSchema.array().parse([
    { id: 'knight', name: '기사', icon: '⚔', baseRT: 90, hp: 100, mp: 24, atk: 26, def: 9, move: 4, range: 1, jump: 1, abilityId: 'dawn-strike', skillId: 'blade-training', weaponFamily: 'sword', scaling: 'strength', base: base(15, 15, 12, 7, 8, 10), growth: base(10, 10, 8, 4, 5, 7) },
    { id: 'ranger', name: '궁수', icon: '➶', baseRT: 80, hp: 76, mp: 24, atk: 23, def: 5, move: 4, range: 4, jump: 2, abilityId: 'piercing-shot', skillId: 'bow-training', weaponFamily: 'bow', scaling: 'dexterity', base: base(12, 10, 16, 8, 9, 8), growth: base(7, 6, 12, 5, 5, 6) },
    { id: 'arcanist', name: '마도사', icon: '✦', baseRT: 95, hp: 68, mp: 36, atk: 27, def: 3, move: 3, range: 3, jump: 1, abilityId: 'starburst', skillId: 'focus-training', weaponFamily: 'arcane', scaling: 'focus', base: base(7, 8, 11, 16, 15, 12), growth: base(4, 5, 7, 12, 10, 8) },
    { id: 'healer', name: '치유사', icon: '☀', baseRT: 85, hp: 80, mp: 36, atk: 20, def: 6, move: 4, range: 3, jump: 1, abilityId: 'dawn-heal', skillId: 'focus-training', weaponFamily: 'sun', scaling: 'focus', base: base(8, 11, 10, 13, 17, 15), growth: base(5, 7, 6, 8, 12, 10) },
]);
CLASSES.push(classSchema.parse({...CLASSES[0], id:'sentinel', name:'파수기사', icon:'♜', hp:112, def:13, move:3, baseRT:100, abilityId:'rally-aegis'}), classSchema.parse({...CLASSES[3], id:'sage', name:'현자', icon:'✧', hp:72, mp:40, abilityId:'circle-of-dawn'}));
// Additive class IDs keep existing save references, equipment families and learning intact.
CLASSES.push(
    classSchema.parse({...CLASSES[0], id:'warrior', name:'전사 · Warrior', hp:96, def:7, baseRT:85}),
    classSchema.parse({...CLASSES[0], id:'spellblade', name:'마법검사 · Spellblade', hp:88, mp:36, abilityId:'moon-bolt', base:base(13,12,12,13,12,11)}),
    classSchema.parse({...CLASSES[4], id:'terror-knight', name:'공포기사 · Terror Knight', hp:108, abilityId:'dawn-strike'}),
    classSchema.parse({...CLASSES[0], id:'berserker', name:'광전사 · Berserker', hp:108, atk:30, def:5, baseRT:95})
);
export const CLASS_ABILITIES: Record<string, string[]> = {knight:['dawn-strike'], ranger:['piercing-shot'], arcanist:['starburst','moon-bolt'], healer:['dawn-heal','circle-of-dawn'], sentinel:['rally-aegis','dawn-strike'], sage:['circle-of-dawn','moon-bolt','dawn-heal']};
Object.assign(CLASS_ABILITIES, {warrior:['dawn-strike'], spellblade:['moon-bolt','dawn-strike'], 'terror-knight':['dawn-strike','rally-aegis'], berserker:['dawn-strike']});
export const ROSTER = [{ id: 'erin', name: '에린', classId: 'knight' }, { id: 'rowan', name: '로웬', classId: 'ranger' }, { id: 'sera', name: '세라', classId: 'arcanist' }, { id: 'miel', name: '미엘', classId: 'healer' }, {id:'lena',name:'레나',classId:'sentinel'}, {id:'iris',name:'이리스',classId:'sage'}, {id:'brina',name:'브리나',classId:'warrior'}, {id:'aelis',name:'엘리스',classId:'spellblade'}, {id:'nyra',name:'니라',classId:'terror-knight'}, {id:'kaela',name:'카엘라',classId:'berserker'}];
export const weaponSchema = z.object({ id, name: z.string(), family: z.string(), bonus: z.number(), frame: z.number().int().min(0).max(7), iconId:z.string().optional(), grip: z.object({ x: z.number(), y: z.number() }), animation: z.enum(['slash', 'thrust', 'shoot', 'cast', 'heal']) });
export const WEAPONS = weaponSchema.array().parse(['sword', 'bow', 'arcane', 'sun'].flatMap((family, j) => [0, 1].map(variant => ({ id: `${family}-${variant ? 'dawn' : 'field'}`, name: `${variant ? '여명' : '기본'} ${['검', '활', '별 지팡이', '성광 지팡이'][j]}`, family, bonus: variant * 5, frame: j * 2 + variant, grip: { x: [.62, .52, .45, .48, .61, .50, .46, .46][j * 2 + variant], y: family === 'bow' ? .5 : .82 }, animation: family === 'sword' ? (variant ? 'thrust' : 'slash') : family === 'bow' ? 'shoot' : family === 'arcane' ? 'cast' : 'heal' }))));
export const abilityById = (id: string) => ABILITIES.find(a => a.id === id)!;
export const jobForHero = (hero: number) => CLASSES.find(c => c.id === ROSTER[hero].classId)!;
export const weaponFor = (hero: number, variant: number) => WEAPONS.filter(w => w.family === jobForHero(hero).weaponFamily)[variant]!;
export function validateContent(classes = CLASSES, abilities = ABILITIES) {
    if (new Set(classes.map(c => c.id)).size !== classes.length || new Set(abilities.map(a => a.id)).size !== abilities.length)
        throw Error('Duplicate content id');
    for (const c of classes) {
        classSchema.parse(c);
        if (!abilities.some(a => a.id === c.abilityId))
            throw Error('Unknown ability ' + c.abilityId);
        if (!SKILLS.some(s => s.id === c.skillId))
            throw Error('Unknown skill ' + c.skillId);
        if (!WEAPONS.some(w => w.family === c.weaponFamily))
            throw Error('Unknown weapon family');
    }
    abilities.forEach(a => abilitySchema.parse(a));
}
validateContent();

export type ExtraSlot = 'offhand'|'armguard'|'accessory';
export type ExtraGear = {id:string;name:string;icon:string;description:string;stats:Partial<Stats>;defense:number;attack?:number;hp?:number;mp?:number;resistance?:number;move?:number};
// Slot structure and summed gear stats follow docs equipment.jpg / OV calculator.
// These small-campaign item names and values are authored, not copied OV records.
export const EXTRA_GEAR:Record<ExtraSlot,ExtraGear[]>={
 offhand:[{id:'empty-hand',name:'보조손 비움',icon:'◇',description:'추가 보정 없음',stats:{},defense:0},{id:'wooden-shield',name:'여행 방패',icon:'🛡',description:'DEF +2 · VIT +2',stats:{vit:2},defense:2}],
 armguard:[{id:'plain-sleeves',name:'여행 소매',icon:'◇',description:'추가 보정 없음',stats:{},defense:0},{id:'silver-bracers',name:'은빛 완갑',icon:'▣',description:'DEF +1 · DEX +2',stats:{dex:2},defense:1}],
 accessory:[{id:'no-jewel',name:'장신구 없음',icon:'◇',description:'추가 보정 없음',stats:{},defense:0},{id:'warrior-ring',name:'여명 근력반지',icon:'◉',description:'STR +3',stats:{str:3},defense:0},{id:'scholar-ring',name:'학자의 반지',icon:'✧',description:'INT +3 · MND +1',stats:{int:3,mnd:1},defense:0}]
};
export const extraGear=(gear:Partial<Record<ExtraSlot,number>>)=>Object.entries(EXTRA_GEAR).map(([slot,list])=>list[gear[slot as ExtraSlot]??0]);

export const ARMOR:ExtraGear[]=[{id:'travel-mail',name:'여행 갑옷',icon:'',description:'추가 보정 없음',stats:{},defense:0},{id:'silver-mail',name:'은빛 중갑',icon:'',description:'DEF +4 · 저항 +5 · 이동 −1',stats:{},defense:4,resistance:5,move:-1}];
export const gearDescription=(item:ExtraGear)=>[...Object.entries(item.stats).map(([k,v])=>`${k.toUpperCase()} ${v!>=0?'+':''}${v}`),...(['attack','defense','hp','mp','resistance','move'] as const).filter(k=>item[k]).map(k=>`${{attack:'ATK',defense:'DEF',hp:'HP',mp:'MP',resistance:'물리저항',move:'이동'}[k]} ${item[k]!>=0?'+':''}${item[k]}`)].join(' · ')||'추가 보정 없음';
for(const item of sourceItems){
 if(item.slot==='weapon')WEAPONS.push(weaponSchema.parse({id:item.id,name:item.name,family:'bow',bonus:item.applied.attack,frame:2,iconId:item.id,grip:{x:item.sourceId===313?.42:item.sourceId===314?.40:.44,y:.5},animation:'shoot'}));
 else if(item.slot!=='consumable'){
  const gear:ExtraGear={id:item.id,name:item.name,icon:'',description:'',...item.applied};gear.description=gearDescription(gear);
  (item.slot==='armor'?ARMOR:EXTRA_GEAR[item.slot as ExtraSlot]).push(gear);
 }
}
const restores=[['mend-leaf','heal',50,10],['ov-1004','heal',100,15],['ov-1008','heal',150,20],['ov-1012','mp',20,5],['ov-1013','tp',50,0]] as const;
for(const [id,effect,power,percent] of restores){
 const source=sourceItems.find(i=>i.id===id)!;
 const ability=abilitySchema.parse({id,name:source.name,description:`${effect==='heal'?'HP':effect.toUpperCase()} ${power}${percent?' + 최대치 '+percent+'%':''} 회복`,cost:0,resource:'mp',range:2,radius:0,target:effect==='heal'?'wounded-ally':'ally',effect,power,percent,formula:'fixed',animation:'heal'});
 const index=ABILITIES.findIndex(a=>a.id===id);if(index>=0)ABILITIES[index]=ability;else{ABILITIES.push(ability);CONSUMABLES.push({abilityId:id,icon:'',stock:0});}
}
