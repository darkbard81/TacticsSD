import {chromium} from '/home/deck/Documents/TacticsSD/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:2});const errors=[],assets=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/\/assets\/(front|back)-.*\.png/.test(r.url()))assets.push({url:r.url(),status:r.status()});});
await page.goto('http://127.0.0.1:4175/game/');await page.waitForFunction(()=>window.tacticsDiagnostics);
async function choose(id){for(let i=0;i<100;i++){if(await page.evaluate(()=>document.activeElement?.dataset.id)===id){await page.keyboard.press('Enter');return;}await page.keyboard.press('ArrowDown');}throw Error(id)}
for(const id of ['new','stage-0','party'])await choose(id);
await page.waitForFunction(()=>{const c=document.querySelector('canvas[data-portrait]');return c&&c.getContext('2d').getImageData(100,100,1,1).data[3]>0;});
for(const id of ['deploy','talk-0','talk-0'])await choose(id);
const iso=await page.evaluate(()=>window.tacticsDiagnostics());await page.keyboard.press('v');const top=await page.evaluate(()=>window.tacticsDiagnostics());
await page.screenshot({path:'/tmp/elf-evidence/production-top.png'});
if(errors.length||!top.top||iso.top||top.dimensions.dpr!==2||assets.length<2||assets.some(a=>a.status!==200))throw Error(JSON.stringify({errors,assets,iso,top}));
await fs.writeFile('/tmp/elf-evidence/production-smoke.json',JSON.stringify({errors,assets,dimensions:top.dimensions,iso:iso.screen,top:top.top},null,2));await browser.close();console.log('Production DPR2 sprite smoke passed');
