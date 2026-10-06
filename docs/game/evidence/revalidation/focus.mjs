import {chromium} from '/home/deck/Documents/TacticsSD/node_modules/playwright-core/index.mjs';import fs from 'node:fs/promises';
const br=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await br.newPage({viewport:{width:1024,height:768},deviceScaleFactor:2});await p.addInitScript(()=>{window.padButtons=[];window.padConnected=true;Object.defineProperty(navigator,'getGamepads',{value:()=>window.padConnected?[{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:window.padButtons.includes(i),value:window.padButtons.includes(i)?1:0}))}]:[]});});
await p.goto('http://127.0.0.1:4174/game/');await p.waitForFunction(()=>window.tacticsDiagnostics);const d=()=>p.evaluate(()=>window.tacticsDiagnostics());
async function choose(id){for(let i=0;i<80;i++){if(await p.evaluate(()=>document.activeElement?.dataset.id)===id){await p.keyboard.press('Enter');return;}await p.keyboard.press('ArrowDown');}throw Error(id)}
for(const id of ['new','stage-0','party','deploy','talk-0','talk-0'])await choose(id);
await p.keyboard.press('e');await choose('move');for(const key of ['ArrowRight','ArrowDown','ArrowRight','ArrowRight'])await p.keyboard.press(key);await p.keyboard.press('Enter');await p.waitForFunction(()=>window.tacticsDiagnostics().mode==='command');await choose('attack');
for(let i=0;i<20 && await p.evaluate(()=>document.activeElement?.dataset.id)!=='back-command';i++)await p.keyboard.press('Tab');
const before=await d();const focused=await p.evaluate(()=>document.activeElement?.dataset.id);await p.screenshot({path:'/tmp/tacticssd-audit/focused-cancel-before.png'});await p.keyboard.press('Enter');const after=await d();await p.screenshot({path:'/tmp/tacticssd-audit/focused-cancel-after.png'});
await p.waitForTimeout(800);
// Hold A, blur then refocus without releasing A.
await p.reload();await p.waitForFunction(()=>window.tacticsDiagnostics);for(const id of ['new','stage-0','party','deploy','talk-0','talk-0'])await choose(id);
await p.evaluate(()=>window.padButtons=[0]);await p.waitForTimeout(70);await p.evaluate(()=>dispatchEvent(new Event('blur')));const blurred=(await d()).modal;await p.evaluate(()=>dispatchEvent(new Event('focus')));await p.waitForTimeout(70);const focusedModal=(await d()).modal;await p.evaluate(()=>window.padButtons=[]);
// disconnect while physical keyboard Enter is still down
await p.keyboard.down('Enter');await p.evaluate(()=>window.padConnected=false);await p.waitForTimeout(70);const lost=(await d()).modal;await p.keyboard.up('Enter');
await fs.writeFile('/tmp/tacticssd-audit/focus-results.json',JSON.stringify({focused,modeBefore:before.mode,modeAfter:after.mode,hpBefore:before.battle.units.find(u=>u.id==='e0').hp,hpAfter:after.battle.units.find(u=>u.id==='e0').hp,blurred,focusedModal,disconnectModal:lost},null,2));console.log(await fs.readFile('/tmp/tacticssd-audit/focus-results.json','utf8'));await br.close();
