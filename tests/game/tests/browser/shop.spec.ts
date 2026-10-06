import {test,expect,type Page} from '@playwright/test';
import {newCampaign,encodeCampaign} from '../../../../game/domain';
import {defaults} from '../../../../game/input';
test.use({viewport:{width:1024,height:768},deviceScaleFactor:2});
async function setup(p:Page,pad=false,rich=false){
 if(rich){const c=newCampaign();c.gold=3000;c.unlocked=1;const raw=encodeCampaign(c);await p.addInitScript(raw=>{if(!localStorage.getItem('tacticssd.campaign'))localStorage.setItem('tacticssd.campaign',raw);},raw);}
 if(pad)await p.addInitScript(()=>{(window as any).padButtons=[];(window as any).padConnected=true;Object.defineProperty(navigator,'getGamepads',{value:()=>[(window as any).padConnected?{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:(window as any).padButtons.includes(i),value:(window as any).padButtons.includes(i)?1:0}))}:null]});});
 await p.goto('/game/');await p.waitForFunction('window.tacticsDiagnostics');await p.waitForTimeout(120);
 const press=async(key:'down'|'confirm'|'cancel')=>{if(pad){const n=defaults().buttons[key];await p.evaluate(n=>{(window as any).padButtons=[n]},n);await p.waitForTimeout(55);await p.evaluate(()=>{(window as any).padButtons=[]});await p.waitForTimeout(55);}else await p.keyboard.press({down:'ArrowDown',confirm:'Enter',cancel:'Escape'}[key]);};
 const pick=async(id:string)=>{for(let i=0;i<100;i++){if(await p.evaluate(()=>(document.activeElement as HTMLElement)?.dataset.id)===id){await press('confirm');return;}await press('down');}throw Error('Cannot reach '+id);};
 await pick(rich?'continue':'new');await pick('shop');return {pick,press};
}
const state=(p:Page)=>p.evaluate('window.tacticsDiagnostics().campaign') as Promise<any>;
for(const pad of [false,true])test(`${pad?'mockpad':'keyboard'} buys, cancels, sells, locks equipped copies and restores quantities`,async({page})=>{
 const {pick,press}=await setup(page,pad);await pick('filter-consumable');await pick('product-mend-leaf');await pick('qty-up');await pick('trade-request');await press('cancel');expect((await state(page)).gold).toBe(100);
 await pick('trade-request');await pick('trade-confirm');expect((await state(page)).gold).toBe(80);expect((await state(page)).inventory['mend-leaf']).toBe(5);
 await pick('shop-sell');await pick('trade-request');await pick('trade-confirm');expect((await state(page)).gold).toBe(85);expect((await state(page)).inventory['mend-leaf']).toBe(4);
 await pick('filter-weapon');await pick('product-sword-field');await expect(page.locator('[data-id=trade-request]')).toBeDisabled();await expect(page.locator('.trade-reason')).toContainText('장착');
 await page.reload();await page.waitForFunction('window.tacticsDiagnostics');await pick('continue');expect((await state(page)).gold).toBe(85);expect((await state(page)).inventory['mend-leaf']).toBe(4);
 await pick('shop');await pick('filter-consumable');await pick('product-mend-leaf');await pick('shop-buy');await pick('qty-up10');await expect(page.locator('[data-id=trade-request]')).toBeDisabled();await expect(page.locator('.trade-reason')).toContainText('부족');
});
test('mockpad source bow purchase equips only the archer and restores into a real battle',async({page})=>{
 const {pick}=await setup(page,true,true);await pick('filter-weapon');await pick('shop-next');await pick('product-ov-313');await expect(page.locator('[data-id=shop-equip]')).toBeDisabled();await pick('trade-request');await pick('trade-confirm');await pick('shop-hero');await pick('shop-equip');expect((await state(page)).gear[1].weapon).toBe(2);
 await pick('world');await pick('stage-0');await pick('party');await pick('deploy');await pick('talk-0');await pick('talk-0');const d=await page.evaluate('window.tacticsDiagnostics()') as any;expect(d.battle.units.find((u:any)=>u.hero===1&&u.team==='ally').weaponVariant).toBe(2);expect(d.battle.units.find((u:any)=>u.hero===1&&u.team==='ally').atk).toBe(28);
});
test('storage failure rolls back, held mixed confirm trades once, cancel wins and disconnect cancels pending trade',async({page})=>{
 const {pick}=await setup(page,true);await pick('filter-consumable');await pick('product-mend-leaf');await pick('trade-request');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).originalSet=original;Storage.prototype.setItem=function(){throw Error('forced quota');};});await pick('trade-confirm');expect((await state(page)).gold).toBe(100);await expect(page.locator('footer')).toContainText('거래가 취소');await page.evaluate(()=>{Storage.prototype.setItem=(window as any).originalSet;});
 await pick('trade-request');await page.keyboard.press('ArrowDown');await page.evaluate(()=>{(window as any).padButtons=[0,1]});await page.waitForTimeout(100);await page.evaluate(()=>{(window as any).padButtons=[]});await page.waitForTimeout(100);expect((await state(page)).gold).toBe(100);expect(await page.evaluate('window.tacticsDiagnostics().modal')).toBeNull();
 await pick('trade-request');await page.keyboard.press('ArrowDown');await page.evaluate(()=>{(window as any).padConnected=false});await page.waitForTimeout(150);expect(await page.evaluate('window.tacticsDiagnostics().modal')).toBeNull();expect((await state(page)).gold).toBe(100);
 await page.evaluate(()=>{(window as any).padConnected=true});await page.waitForTimeout(150);await pick('trade-request');await page.keyboard.press('ArrowDown');await page.keyboard.down('Enter');await page.evaluate(()=>{(window as any).padButtons=[0]});await page.waitForTimeout(700);await page.keyboard.up('Enter');await page.evaluate(()=>{(window as any).padButtons=[]});expect((await state(page)).gold).toBe(90);expect((await state(page)).inventory['mend-leaf']).toBe(4);
});
test('catalog unavailable rows have no purchase action; all shop filters and loaded icons fit DPR2 minimum',async({page})=>{
 const {pick}=await setup(page,false,true);for(const filter of ['weapon','armor','offhand','armguard','accessory','consumable']){
  await pick('filter-'+filter);const clipped=await page.locator('.shop button').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.top<0||r.bottom>673||r.left<0||r.right>1024;}).map(e=>(e as HTMLElement).dataset.id));expect(clipped).toEqual([]);
 }
 await pick('catalog');await expect(page.locator('.catalog')).toContainText('1,142');await expect(page.locator('.catalog [data-id^=product]')).toHaveCount(0);await pick('catalog-next10');await pick('catalog-group-armor');await expect(page.locator('.catalog-rows')).toContainText('Buckler');await pick('catalog-group-sundries');await expect(page.locator('.catalog-rows')).toContainText('Mend Leaf');
});

test('expanded seven-item bag keeps its return action visible at minimum size',async({page})=>{
 const {pick,press}=await setup(page);await press('cancel');await pick('stage-0');await pick('party');await pick('items');await expect(page.locator('.supply-list article')).toHaveCount(7);const r=await page.locator('[data-id=party]').boundingBox();expect(r!.y+r!.height).toBeLessThan(668);await pick('party');expect(await page.evaluate('window.tacticsDiagnostics().screen')).toBe('party');
});
test('stage preview keeps all 64 transformed terrain cells inside the viewport',async({page})=>{const {pick,press}=await setup(page);await press('cancel');await pick('stage-0');const clipped=await page.locator('.mini-board i').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>1024||r.top<0||r.bottom>668;}).length);expect(clipped).toBe(0);await expect(page.locator('.mini-board i')).toHaveCount(64);});
