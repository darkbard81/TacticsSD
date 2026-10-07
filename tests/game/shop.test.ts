import {describe,it,expect} from 'vitest';
import {PRODUCTS,trade,tradeReason,inventoryFor,equip,equippedCount,validateInventory} from '../../game/shop';
import {newCampaign,encodeCampaign,parseCampaign,makeBattle,damage,act} from '../../game/domain';
import {derive} from '../../game/calculation';
import {WEAPONS,ARMOR,EXTRA_GEAR,CONSUMABLES} from '../../game/content';
import source from '../../game/source-items.json' with {type:'json'};
import catalog from '../../game/source-catalog.json' with {type:'json'};
import frames from '../../game/assets/items.json' with {type:'json'};
import {readFileSync} from 'node:fs';
describe('source catalog and finite economy',()=>{
 it('deduplicates every registered item, binds unique art, and separates all source rows',()=>{
  expect(PRODUCTS).toHaveLength(44);expect(new Set(PRODUCTS.map(p=>p.id)).size).toBe(44);expect(source).toHaveLength(28);expect(catalog).toHaveLength(1170);expect(catalog.filter(p=>p.registered)).toHaveLength(28);expect(Object.keys(frames)).toHaveLength(36);
  for(const p of PRODUCTS)expect(p.id in frames||WEAPONS.some(w=>w.id===p.id&&!w.iconId)).toBe(true);
  expect(new Set(Object.values(frames).map(f=>`${f.x},${f.y}`)).size).toBe(36);
  for(const p of source){const table=JSON.parse(readFileSync(`docs/game/reference/${p.slot==='weapon'?'weapons':p.slot==='consumable'?'sundries':'armor'}.json`,'utf8'));expect(p.source.raw).toEqual(table.find((r:any)=>r.id===p.sourceId));expect(p.price).toBe(Math.ceil(p.source.price/10));}
 });
 it('rejects invalid quantities, unknown references and locked goods without mutation',()=>{
  const c=newCampaign(),before=structuredClone(c);for(const quantity of [-1,0,.5,NaN,Infinity,100])expect(trade(c,{kind:'buy',id:'mend-leaf',quantity})).toBeNull();expect(trade(c,{kind:'buy',id:'ov-1',quantity:1})).toBeNull();expect(tradeReason(c,{kind:'buy',id:'ov-315',quantity:1})).toContain('거점');expect(c).toEqual(before);
 });
 it('buys exactly affordable quantities, prevents debt, and sells at half price',()=>{
  const c=newCampaign();const n=trade(c,{kind:'buy',id:'mend-leaf',quantity:10})!;expect(n.gold).toBe(0);expect(n.inventory!['mend-leaf']).toBe(13);expect(trade(n,{kind:'buy',id:'mend-leaf',quantity:1})).toBeNull();const sold=trade(n,{kind:'sell',id:'mend-leaf',quantity:10})!;expect(sold.gold).toBe(50);expect(sold.inventory!['mend-leaf']).toBe(3);expect(c.gold).toBe(100);
 });
 it('counts bench equipment, blocks selling equipped copies, and frees copies on swap',()=>{
  const c=newCampaign();c.inventory=inventoryFor(c);expect(equippedCount(c,'sword-field')).toBe(6);expect(trade(c,{kind:'sell',id:'sword-field',quantity:1})).toBeNull();expect(equip(c,0,'weapon',1)).toBe(true);expect(trade(c,{kind:'sell',id:'sword-field',quantity:1})!.inventory!['sword-field']).toBe(5);expect(equip(c,1,'weapon',4)).toBe(false);
 });
 it('preserves stable source gear IDs and inventory through saves; rejects missing copies and unknown IDs',()=>{
  let c=newCampaign();c.gold=2000;c=trade(c,{kind:'buy',id:'ov-313',quantity:1})!;expect(equip(c,1,'weapon',2)).toBe(true);const raw=encodeCampaign(c);expect(raw).toContain('ov-313');expect(parseCampaign(raw)).toEqual(c);
  const malformed=JSON.parse(raw);malformed.inventory['ov-313']=0;expect(parseCampaign(JSON.stringify(malformed))).toBeNull();malformed.inventory['ov-313']=1;malformed.inventory.fake=1;expect(parseCampaign(JSON.stringify(malformed))).toBeNull();
 });
 it('rejects obsolete saves while retaining complete current armory',()=>{const c=newCampaign();expect(parseCampaign(encodeCampaign(c))).toEqual(c);expect(parseCampaign(JSON.stringify({...c,gear:c.gear.slice(0,4)}))).toBeNull();});
 it('enforces inventory and currency caps without overflow',()=>{const c=newCampaign();c.inventory={...inventoryFor(c),'mend-leaf':999};expect(trade(c,{kind:'buy',id:'mend-leaf',quantity:1})).toBeNull();c.gold=99999;expect(trade(c,{kind:'sell',id:'mend-leaf',quantity:1})).toBeNull();expect(()=>validateInventory({...c,inventory:{...c.inventory,'mend-leaf':1000}})).toThrow();});
 it('applies bought source armor, accessory attack and stats to the same combat derivation',()=>{
  let c=newCampaign();c.gold=5000;c.unlocked=1;for(const id of ['ov-448','ov-537','ov-490'])c=trade(c,{kind:'buy',id,quantity:1})!;
  expect(equip(c,0,'armor',ARMOR.findIndex(a=>a.id==='ov-448'))).toBe(true);expect(equip(c,0,'accessory',EXTRA_GEAR.accessory.findIndex(a=>a.id==='ov-537'))).toBe(true);expect(equip(c,0,'armguard',EXTRA_GEAR.armguard.findIndex(a=>a.id==='ov-490'))).toBe(true);
  const d=derive(0,1,c.gear[0]),base=derive(0,1,{weapon:0,armor:0});expect(d.attack-base.attack).toBe(4);expect(d.hp-base.hp).toBe(7);expect(d.stats.vit-base.stats.vit).toBe(2);expect(makeBattle(0,c).units[0].derived).toEqual(d);
 });
 it('uses URL restoration formulas and actual shared bag quantities',()=>{
  const c=newCampaign();c.inventory={...inventoryFor(c),'ov-1004':1,'ov-1012':1,'ov-1013':1};const b=makeBattle(0,c),u=b.units[0];u.itemId='ov-1004';u.hp=1;expect(damage(b,u,u,'item')).toBe(99);expect(act(b,u,u,'item')).toBe(true);expect(u.hp).toBe(100);expect(b.inventory['ov-1004']).toBe(0);
  for(const [id,expected] of [['mend-leaf',60],['ov-1012',21],['ov-1013',50]] as const){u.itemId=id;u.hp=1;u.mp=0;u.tp=0;expect(damage(b,u,u,'item')).toBe(expected);}
  expect(CONSUMABLES).toHaveLength(7);
 });
});
