import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test.use({viewport:{width:1024,height:768},deviceScaleFactor:2});
async function choose(p:Page,id:string){for(let i=0;i<100;i++){if(await p.evaluate(()=>(document.activeElement as HTMLElement)?.dataset.id)===id){await p.keyboard.press('Enter');return;}await p.keyboard.press('ArrowDown');}throw Error(id);}
async function party(p:Page){await p.goto('/game/');await p.waitForFunction('window.tacticsDiagnostics');await choose(p,'new');await choose(p,'stage-0');await choose(p,'party');}
const cyan=(p:Page)=>p.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-portrait="0"]')!.getContext('2d')!,d=c.getImageData(0,0,200,220).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<10&&d[i+1]>240&&d[i+2]>240&&d[i+3]>200)n++;return n;});
test('editor v2 export, replacement import and reload preserve the actual game art',async({page})=>{
 await party(page);await choose(page,'equipment');await page.keyboard.press('p');await choose(page,'save');await page.keyboard.press('Escape');await choose(page,'rig-settings');
 const rig=JSON.parse(await readFile(resolve('game/assets/dawn-rig.json'),'utf8'));rig.views.Front.parts.find((p:any)=>p.id==='head').replacement={id:'test-cyan',name:'test-cyan.png',width:10,height:10};
 const serialized=await page.evaluate(async data=>{const path='/tools/characterRig/io/rig-file.ts';const module=await import(path);return module.serializeRig(data);},rig);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=10;const ctx=c.getContext('2d')!;ctx.fillStyle='#00ffff';ctx.fillRect(0,0,10,10);return c.toDataURL().split(',')[1];});
 const json={name:'edited-rig.json',mimeType:'application/json',buffer:Buffer.from(serialized)};
 await page.locator('#game-rig-files').setInputFiles([json]);await expect(page.locator('footer')).toContainText('이미지 누락');expect(await cyan(page)).toBe(0);
 await page.locator('#game-rig-files').setInputFiles([json,{name:'dawn-parts.png',mimeType:'image/png',buffer:await readFile(resolve('game/assets/dawn-parts.png'))},{name:'test-cyan.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
 await expect(page.locator('footer')).toContainText('교체 파츠를 적용');await expect.poll(()=>cyan(page)).toBeGreaterThan(300);
 await page.reload();await page.waitForFunction('window.tacticsDiagnostics');await choose(page,'continue');await choose(page,'stage-0');await choose(page,'party');await expect.poll(()=>cyan(page)).toBeGreaterThan(300);
 await choose(page,'equipment');await choose(page,'rig-settings');await choose(page,'rig-reset');await expect(page.locator('footer')).toContainText('진행 중인 편성은 유지');await expect.poll(()=>cyan(page)).toBe(0);expect(await page.evaluate('window.tacticsDiagnostics().screen')).toBe('equipment');
});
test('ten recruits and training actions stay visible at 1024×768 DPR2 and saved learning is playable',async({page})=>{await party(page);for(const id of ['toggle-0','toggle-5','toggle-9','training','deploy']){const r=await page.locator(`[data-id="${id}"]`).boundingBox();expect(r!.y+r!.height).toBeLessThan(668);}
 await choose(page,'training');await choose(page,'hero-2');await choose(page,'learn-moon-bolt');await choose(page,'support-fleet-foot');const r=await page.locator('[data-id="party"]').boundingBox();expect(r!.y+r!.height).toBeLessThan(668);await choose(page,'party');for(const id of ['deploy','talk-0','talk-0'])await choose(page,id);const d=await page.evaluate('window.tacticsDiagnostics()') as any;expect(d.battle.units[2].abilityId).toBe('moon-bolt');expect(d.battle.units[2].move).toBe(4);expect(d.dimensions).toMatchObject({width:1024,height:768,backingWidth:2048,backingHeight:1536,dpr:2});
});
test('mockpad equips all five slots, sees summed stats and restores them into battle',async({page})=>{await page.addInitScript(()=>{(window as any).padButtons=[];Object.defineProperty(navigator,'getGamepads',{value:()=>[{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:(window as any).padButtons.includes(i),value:(window as any).padButtons.includes(i)?1:0}))}]});});
 const press=async(n:number)=>{await page.evaluate(n=>{(window as any).padButtons=[n]},n);await page.waitForTimeout(70);await page.evaluate(()=>{(window as any).padButtons=[]});await page.waitForTimeout(70);};
 const pick=async(id:string)=>{for(let i=0;i<100;i++){if(await page.evaluate(()=>(document.activeElement as HTMLElement)?.dataset.id)===id){await press(0);return;}await press(13);}throw Error(id);};
 await page.goto('/game/');await page.waitForFunction('window.tacticsDiagnostics');for(const id of ['new','stage-0','party','equipment','gear-weapon-1','gear-armor-1','gear-offhand-1','gear-armguard-1','gear-accessory-1'])await pick(id);
 await expect(page.locator('[data-stat=str]')).toHaveText('28');await expect(page.locator('[data-stat=vit]')).toHaveText('27');await expect(page.locator('[data-stat=dex]')).toHaveText('24');
 const outside=await page.locator('.roster button').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.y<0||r.bottom>668||r.left<0||r.right>1024;}).map(e=>e.textContent));expect(outside).toEqual([]);
 await press(9);await pick('save');await press(1);await page.reload();await page.waitForFunction('window.tacticsDiagnostics');for(const id of ['continue','stage-0','party','deploy','talk-0','talk-0'])await pick(id);const d=await page.evaluate('window.tacticsDiagnostics()') as any;expect(d.battle.units[0].derived.stats).toMatchObject({str:28,vit:27,dex:24});expect(d.battle.units[0].def).toBe(16);expect(d.campaign.gear[0]).toMatchObject({weapon:1,armor:1,offhand:1,armguard:1,accessory:1});
});
