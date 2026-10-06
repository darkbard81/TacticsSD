import {chromium} from '/home/deck/Documents/TacticsSD/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const out='/tmp/normalized26'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const response=await page.goto('http://127.0.0.1:5173/game/');await page.waitForFunction(()=>window.tacticsDiagnostics);
async function choose(id){for(let i=0;i<100;i++){if(await page.evaluate(()=>document.activeElement?.dataset.id)===id){await page.keyboard.press('Enter');return;}await page.keyboard.press('ArrowDown');}throw Error(id)}
for(const id of ['new','stage-0','party'])await choose(id);
await page.screenshot({path:out+'/party.png'});
for(const id of ['deploy','talk-0','talk-0'])await choose(id);
await page.screenshot({path:out+'/battle-isometric.png'});await page.keyboard.press('v');await page.screenshot({path:out+'/battle-top.png'});
const initial=await page.evaluate(()=>window.tacticsDiagnostics().dimensions);await page.setViewportSize({width:1280,height:900});await page.waitForFunction(()=>window.tacticsDiagnostics().dimensions.width===1280);
const resized=await page.evaluate(()=>window.tacticsDiagnostics().dimensions);await page.setViewportSize({width:1024,height:768});
await page.evaluate(async()=>{const {ElfSprites,elfSocket,elfPose,ELF_STATES}=await import('/game/elf-sprites.ts');const atlas=(await import('/game/assets/elf-sd-sheet-v2/frames.json')).default;
const elf=new ElfSprites();await elf.ready;window.audit={elf,elfSocket,elfPose,ELF_STATES,atlas};document.body.innerHTML='<canvas width="2048" height="1536" style="width:1024px;height:768px"></canvas>';});
const sockets=await page.evaluate(()=>{const{elf,elfSocket,elfPose,ELF_STATES,atlas}=window.audit,c=document.createElement('canvas');c.width=1792;c.height=1024;const ctx=c.getContext('2d');ctx.drawImage(elf.sheet,0,0);const result=[];for(const dir of ['SE','NE'])for(const state of ELF_STATES)for(let frame=0;frame<atlas.sequences.front[state].length;frame++){const p={state,frame},f=elfPose(dir,p),{hand:[x,y]}=elfSocket(dir,p);result.push({id:f.id,x,y,pixel:Array.from(ctx.getImageData(f.rect.x+x,f.rect.y+y,1,1).data)});}return result;});
for(const direction of ['SE','NE']){
await page.evaluate(direction=>{const {elf}=window.audit,c=document.querySelector('canvas').getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#19353b';c.fillRect(0,0,1024,768);for(let row=0;row<4;row++)for(let col=0;col<7;col++){c.save();c.translate(76+col*146,157+row*188);elf.draw(c,row,row===0?0:1,direction,0,145,false,(col+.1)/7,['slash','shoot','cast','heal'][row]);c.restore();c.fillStyle='#eedcb6';c.font='12px sans-serif';c.textAlign='center';c.fillText(['SWORD','BOW','SPELL','HEAL'][row]+' · '+col,76+col*146,178+row*188);}},direction);await page.screenshot({path:out+'/actions-'+direction+'.png'});
}
await page.evaluate(()=>{const{elf}=window.audit,c=document.querySelector('canvas').getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#19353b';c.fillRect(0,0,1024,768);for(let row=0;row<4;row++)for(let col=0;col<4;col++){c.save();c.translate(130+col*255,158+row*188);const dir=['SE','SW','NE','NW'][row];elf.draw(c,0,0,dir,col/9+.001,160,false,(col+.1)/4,'item');c.restore();c.fillStyle='#eedcb6';c.font='13px sans-serif';c.textAlign='center';c.fillText(['SE','SW','NE','NW'][row]+' ITEM · '+col,130+col*255,179+row*188);}});await page.screenshot({path:out+'/items.png'});
await fs.writeFile(out+'/runtime.json',JSON.stringify({url:page.url(),http:response.status(),initial,resized,errors,sockets},null,2));await browser.close();console.log(JSON.stringify({out,errors,initial,resized}));
