import { chromium } from '/home/deck/Documents/TacticsSD/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:2});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const diag=()=>page.evaluate(()=>window.tacticsDiagnostics());
const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=n=>page.screenshot({path:'/tmp/tacticssd-audit/'+n+'.png'});
async function choose(id){for(let i=0;i<90;i++){if(await page.evaluate(()=>document.activeElement?.dataset.id)===id){await page.keyboard.press('Enter');return;}await page.keyboard.press('ArrowDown');}throw Error('focus '+id);}
async function boot(){await page.goto('http://127.0.0.1:4174/game/');await page.waitForFunction(()=>window.tacticsDiagnostics);await frames();}
async function deploy(){await choose('new');await shot('world');await choose('stage-0');await shot('stage');await choose('party');await shot('party');await choose('equipment');await shot('equipment');await page.keyboard.press('Escape');await choose('items');await shot('items');await page.keyboard.press('Escape');await choose('deploy');await shot('dialogue');await choose('talk-0');await choose('talk-0');await frames();}
let results={};await boot();await deploy();await page.waitForTimeout(400);await shot('battle-isometric');results.dimensions=(await diag()).dimensions;await page.keyboard.press('v');await shot('battle-top');await page.keyboard.press('v');
// Wait cancellation grants defense without taking a turn.
await page.keyboard.press('e');results.beforeWait=(await diag()).battle.units[0];await choose('wait');await page.keyboard.press('Escape');results.afterCancelWait=(await diag()).battle.units[0];await shot('free-guard');
// Real viewport and DPR update through CDP.
await page.setViewportSize({width:1280,height:900});await frames();results.resized=(await diag()).dimensions;const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await frames();results.dprChanged=(await diag()).dimensions;await cdp.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:2,mobile:false});
// Tab accepted as a movement binding but always intercepted.
await page.keyboard.press('p');await choose('settings');await choose('bind-keys-0');await page.keyboard.press('Tab');results.tabBinding=(await diag()).bindings.keys.up;await page.keyboard.press('Escape');await page.keyboard.press('Escape');await choose('move');results.tabBefore=(await diag()).cursor;await page.keyboard.press('Tab');results.tabAfter=(await diag()).cursor;await shot('tab-binding');
// reset controls, assign Space to view; Space also confirms selected command.
await page.keyboard.press('Escape');await page.keyboard.press('p');await choose('settings');await choose('defaults');await choose('settings-next');await choose('bind-keys-9');await page.keyboard.press('Space');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
// focus movement without executing
for(let i=0;i<20 && await page.evaluate(()=>document.activeElement?.dataset.id)!=='move';i++)await page.keyboard.press('ArrowDown');
results.spaceBefore={mode:(await diag()).mode,top:(await diag()).top};await page.keyboard.press('Space');results.spaceAfter={mode:(await diag()).mode,top:(await diag()).top};await shot('space-double-action');
// Mock controller cannot cancel a button capture; B is rebound.
await ctx.close();const ctx2=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:2});const p2=await ctx2.newPage();await p2.addInitScript(()=>{window.padButtons=[];window.padConnected=true;Object.defineProperty(navigator,'getGamepads',{value:()=>window.padConnected?[{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:window.padButtons.includes(i),value:window.padButtons.includes(i)?1:0}))}]:[]});});await p2.goto('http://127.0.0.1:4174/game/');await p2.waitForFunction(()=>window.tacticsDiagnostics);await p2.waitForTimeout(100);
async function pad(n){await p2.evaluate(n=>window.padButtons=[n],n);await p2.waitForTimeout(50);await p2.evaluate(()=>window.padButtons=[]);await p2.waitForTimeout(50);}
async function pickPad(id){for(let i=0;i<90;i++){if(await p2.evaluate(()=>document.activeElement?.dataset.id)===id){await pad(0);return;}await pad(13);}throw Error('padfocus '+id);}
await pickPad('settings');await pickPad('bind-keys-0');await pad(1);await pad(9);results.padKeyboardCapture={text:await p2.locator('[role=dialog]').innerText(),modal:(await p2.evaluate(()=>window.tacticsDiagnostics())).modal};await p2.screenshot({path:'/tmp/tacticssd-audit/pad-capture-trap.png'});
await p2.keyboard.press('Escape');await pickPad('bind-buttons-0');await pad(1);results.padCancelRebind=(await p2.evaluate(()=>window.tacticsDiagnostics())).bindings.buttons;
results.errors=errors;await fs.writeFile('/tmp/tacticssd-audit/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
