import {WEAPONS,ARMOR,EXTRA_GEAR,CONSUMABLES,ROSTER,weaponFor,abilityById,jobForHero,type ExtraSlot} from './content';
import sourceItems from './source-items.json' with {type:'json'};
import frames from './assets/items.json' with {type:'json'};
import type {Campaign} from './domain';
export type Slot='weapon'|'armor'|ExtraSlot;
export type Product={id:string;name:string;slot:Slot|'consumable';price:number;unlock:number;description:string;source:typeof sourceItems[number]|null};
const custom=(id:string,name:string,slot:Product['slot'],price:number,description:string):Product=>({id,name,slot,price,unlock:0,description,source:null});
export const PRODUCTS:Product[]=[...WEAPONS.filter(w=>!w.iconId).map(w=>custom(w.id,w.name,'weapon',w.bonus?70:30,`ATK +${w.bonus} · ${w.family}`)),...ARMOR.slice(0,2).map((a,i)=>custom(a.id,a.name,'armor',i?65:20,a.description)),...Object.entries(EXTRA_GEAR).flatMap(([slot,items])=>items.filter(i=>!i.id.startsWith('ov-')&&!['empty-hand','plain-sleeves','no-jewel'].includes(i.id)).map(i=>custom(i.id,i.name,slot as ExtraSlot,50,i.description))),...['aether-draught','valor-draught'].map(id=>custom(id,abilityById(id).name,'consumable',15,abilityById(id).description)),...sourceItems.map(item=>({id:item.id,name:item.name,slot:item.slot as Product['slot'],price:item.price,unlock:item.unlock,description:item.slot==='consumable'?abilityById(item.id).description:item.slot==='weapon'?`ATK +${item.applied.attack} · 궁수 전용 · 전투 사거리 4`:([...ARMOR,...Object.values(EXTRA_GEAR).flat()].find(i=>i.id===item.id)?.description??''),source:item}))];
export const productById=(id:string)=>PRODUCTS.find(p=>p.id===id);
export const SLOT_NAMES:Record<Product['slot'],string>={weapon:'주무기',armor:'몸 방어구',offhand:'보조손',armguard:'팔 방어구',accessory:'장신구',consumable:'보급품'};
export function equippedIds(c:Campaign):string[]{return c.gear.flatMap((g,h)=>[weaponFor(h,g.weapon).id,ARMOR[g.armor].id,...(['offhand','armguard','accessory'] as const).map(s=>EXTRA_GEAR[s][g[s]??0].id)]).filter(id=>productById(id));}
export const equippedCount=(c:Campaign,id:string)=>equippedIds(c).filter(i=>i===id).length;
/** Legacy saves receive the finite original armory, preserving previously selectable gear. */
export function inventoryFor(c:Campaign):Record<string,number>{
 if(c.inventory)return c.inventory;
 const counts:Record<string,number>={};
 for(const p of PRODUCTS.filter(p=>!p.source))counts[p.id]=p.slot==='consumable'?1:p.slot==='weapon'?ROSTER.filter((_,h)=>jobForHero(h).weaponFamily===WEAPONS.find(w=>w.id===p.id)!.family).length:ROSTER.length;
 for(const item of CONSUMABLES)counts[item.abilityId]=item.stock;
 for(const id of equippedIds(c))counts[id]=Math.max(counts[id]??0,equippedCount(c,id));
 return counts;
}
export function validateInventory(c:Campaign){if(!c.inventory)return;for(const [id,n]of Object.entries(c.inventory))if(!productById(id)||!Number.isInteger(n)||n<0||n>999)throw Error('Unknown or invalid inventory');for(const id of equippedIds(c))if((c.inventory[id]??0)<equippedCount(c,id))throw Error('Equipped items exceed owned inventory');}
export type Quote={kind:'buy'|'sell';id:string;quantity:number};
export function tradeReason(c:Campaign,q:Quote):string{
 const p=productById(q.id),n=q.quantity;if(!p)return '등록되지 않은 품목입니다.';
 if(!Number.isInteger(n)||n<1||n>99)return '수량은 1–99개여야 합니다.';
 if(q.kind!=='buy'&&q.kind!=='sell')return '거래 종류가 올바르지 않습니다.';
 const owned=inventoryFor(c)[p.id]??0;
 if(q.kind==='buy'){
  if(c.unlocked<p.unlock)return '첫 거점을 해방하면 입고됩니다.';
  if(c.gold<p.price*n)return '전쟁 자금이 부족합니다.';
  if(owned+n>999)return '품목 보유 한도는 999개입니다.';
 }else{
  if(owned-equippedCount(c,p.id)<n)return '장착 중인 수량은 판매할 수 없습니다.';
  if(c.gold+Math.floor(p.price/2)*n>99999)return '전쟁 자금 한도는 99,999 G입니다.';
 }
 return '';
}
/** Immutable candidate; caller persists this snapshot before replacing the live state. */
export function trade(c:Campaign,q:Quote):Campaign|null{
 if(tradeReason(c,q))return null;const next=structuredClone(c),p=productById(q.id)!;next.inventory={...inventoryFor(c)};
 next.inventory[p.id]=(next.inventory[p.id]??0)+(q.kind==='buy'?q.quantity:-q.quantity);
 next.gold+=(q.kind==='buy'?-p.price:Math.floor(p.price/2))*q.quantity;return next;
}
export function gearId(c:Campaign,h:number,slot:Slot,n=c.gear[h][slot]??0):string{return slot==='weapon'?weaponFor(h,n)?.id??'':slot==='armor'?ARMOR[n]?.id??'':EXTRA_GEAR[slot][n]?.id??'';}
export function canEquip(c:Campaign,h:number,slot:Slot,n:number){const id=gearId(c,h,slot,n);return Boolean(id)&&(gearId(c,h,slot)===id||!productById(id)||(inventoryFor(c)[id]??0)>equippedCount(c,id));}
export function equip(c:Campaign,h:number,slot:Slot,n:number){if(!canEquip(c,h,slot,n))return false;c.gear[h][slot]=n;return true;}
const atlasUrl=new URL('./assets/items.png',import.meta.url).href,weaponUrl=new URL('./assets/weapons.png',import.meta.url).href;
export function itemIcon(id:string,large=false){const f=(frames as Record<string,{x:number;y:number}>)[id];if(f)return `<span class="item-icon ${large?'large':''}" aria-hidden="true" style="background-image:url('${atlasUrl}');background-size:800% 800%;background-position:${f.x/1792*100}% ${f.y/1792*100}%"></span>`;const w=WEAPONS.find(w=>w.id===id);return w?`<span class="item-icon ${large?'large':''}" aria-hidden="true" style="background-image:url('${weaponUrl}');background-size:400% 200%;background-position:${w.frame%4*100/3}% ${Math.floor(w.frame/4)*100}%"></span>`:'';}
