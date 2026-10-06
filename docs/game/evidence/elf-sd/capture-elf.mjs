import {chromium} from '/home/deck/Documents/TacticsSD/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const out='/tmp/elf-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:2});
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/game/');await page.waitForFunction(()=>window.tacticsDiagnostics);
async function choose(id){for(let i=0;i<100;i++){if(await page.evaluate(() => document.activeElement?.dataset.id)===id){await page.keyboard.press('Enter');return;}await page.keyboard.press('ArrowDown');}throw Error(id)}
for(const id of ['new','stage-0','party'])await choose(id);
await page.waitForTimeout(1800);await page.screenshot({path:out+'/party.png'});
for(const id of ['deploy','talk-0','talk-0'])await choose(id);
await page.screenshot({path:out+'/battle-isometric.png'});await page.keyboard.press('v');await page.screenshot({path:out+'/battle-top.png'});
await fs.writeFile(out+'/runtime.json',JSON.stringify({diagnostics:await page.evaluate(()=>window.tacticsDiagnostics()),errors},null,2));
await page.evaluate(async()=>{
 const {Renderer}=await import('/game/render.ts');const {makeBattle,newCampaign}=await import('/game/domain.ts');
 document.body.innerHTML='<div id="audit"></div>';const r=new Renderer(document.querySelector('#audit'));await r.elf.ready;
 r.canvas.width=2048;r.canvas.height=1536;r.canvas.style.width='1024px';r.canvas.style.height='768px';
 window.audit={r,unit:makeBattle(0,newCampaign()).units[0]};
});
for(const view of ['SE','NE']){
 await page.evaluate(view=>{const {r,unit}=window.audit,c=r.canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#19353b';c.fillRect(0,0,1024,768);r.cell=100;
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const u={...unit,id:'pose',hero:row,weaponVariant:row===0?0:1,facing:view};r.animationTime=(col+.3)/4*.65;r.attacks.set('pose',{start:0,kind:'attack'});r.actor(u,{x:145+col*245,y:176+row*185},false,false,false);
  c.fillStyle='#eedcb6';c.font='13px sans-serif';c.textAlign='center';c.fillText(['MELEE','BOW','ARCANE','HEAL'][row]+' · '+col,145+col*245,194+row*185);
 }},view);await page.screenshot({path:out+'/actions-'+view+'.png'});
}
// Actual canvas motion: four directions, normal game size and enlarged detail, 36fps-equivalent samples.
for(let f=0;f<48;f++){
 const data=await page.evaluate(f=>{const {r,unit}=window.audit,c=r.canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#19353b';c.fillRect(0,0,1024,768);
  const dirs=['SE','SW','NE','NW'];const phase=(f%24)/24;
  for(let row=0;row<6;row++)for(let col=0;col<4;col++){
   const hero=[0,1,0,1,2,3][row],u={...unit,id:`${row}-${col}`,hero,weaponVariant:row===2&&col%2?1:0,facing:dirs[col]};r.cell=row===0?50:65;r.animationTime=f/24;
   r.attacks.delete(u.id);r.effects.delete(u.id);
   if(row>=2&&row<=4)r.attacks.set(u.id,{start:r.animationTime-phase*.65,kind:'attack'});
   if(row===5)r.effects.set(u.id,r.animationTime+(1-phase)*.4);
   r.actor(u,{x:135+col*245,y:110+row*127},row===1,false,false);
   c.fillStyle='#eedcb6';c.font='12px sans-serif';c.textAlign='center';c.fillText(['IDLE · game size','WALK','SLASH / THRUST','BOW DRAW / RELEASE','CAST','HURT'][row]+' · '+dirs[col],135+col*245,124+row*127);
  }return r.canvas.toDataURL().split(',')[1];},f);
 await fs.writeFile(out+`/motion-${String(f).padStart(2,'0')}.png`,Buffer.from(data,'base64'));
}
await browser.close();console.log(JSON.stringify({out,errors}));
