import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRig, makeView, serializeRig, type CharacterRigData } from '../../domain/rig';
declare global { interface Window { rigDiagnostics: () => { assets: number; listeners: number; nodes: number; sprites: number; rig: CharacterRigData; seconds: number; mode: string; playing: boolean; missing: number; poses: { direction:string;x:number;y:number;scaleX:number;scaleY:number;parts:{id:string;x:number;y:number;worldX:number;worldY:number;socketWorldX:number;socketWorldY:number;parentId:string|null;scaleX:number;scaleY:number;rotation:number;visible:boolean;zIndex:number;frame:{x:number;y:number;width:number;height:number}}[] }[] } } }
const diag = (page: Page) => page.evaluate(()=>window.rigDiagnostics());
const uploadJSON = async (page: Page, text: string) => { await page.locator('#load-json').setInputFiles({name:'test.rig.json',mimeType:'application/json',buffer:Buffer.from(text)}); await expect(page.locator('#app')).toHaveAttribute('aria-busy','false'); };
const sourceImage = 'tools/characterRig/assets/elf-front.png';
const details = async(page: Page, section: string) => { const node=page.locator(`details[data-section="${section}"]`); if(!(await node.getAttribute('open')!==null))await node.locator('summary').click(); };
const field = (page: Page, path: string) => page.locator(`input[data-path="${path}"]`);
const ready = async(page: Page) => {await page.goto('/tools/characterRig/');await expect.poll(async()=>(await diag(page)).assets).toBe(1);await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');};

test('generated elf: edit both views, drag and resize in original pixels, keyboard, zoom and playback',async({page})=>{
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await expect(page.locator('#preview canvas')).toBeVisible();
  await page.locator('#parts [data-part="body"]').click();
  const original=(await diag(page)).rig.views.Front.parts.find(p=>p.id==='body')!;
  await field(page,'rect.width').fill('200');
  await expect.poll(async()=>(await diag(page)).rig.views.Front.parts.find(p=>p.id==='body')!.rect.width).toBe(200);
  const before=(await diag(page)).rig;
  await page.getByRole('button',{name:'확대',exact:true}).click();
  await page.getByRole('button',{name:'영역 이동',exact:true}).click();
  const rect=page.locator('#source rect[data-part="body"]'),box=await rect.boundingBox();expect(box).not.toBeNull();
  const sourceScale=box!.width/200;
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height*0.75);
  await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+10*sourceScale,box!.y+box!.height*0.75+8*sourceScale);await page.mouse.up();
  const moved=(await diag(page)).rig.views.Front.parts.find(p=>p.id==='body')!;
  expect(moved.rect.x).toBeCloseTo(original.rect.x+10,0);expect(moved.rect.y).toBeCloseTo(original.rect.y+8,0);
  const handle=page.locator('#source rect[data-action="se"]');const h=await handle.boundingBox();
  await page.mouse.move(h!.x+h!.width/2,h!.y+h!.height/2);await page.mouse.down();await page.mouse.move(h!.x+h!.width/2+15*sourceScale,h!.y+h!.height/2+12*sourceScale);await page.mouse.up();
  expect((await diag(page)).rig.views.Front.parts.find(p=>p.id==='body')!.rect.width).toBeCloseTo(215,0);
  await page.locator('#source svg').focus();await page.keyboard.press('ArrowRight');
  expect((await diag(page)).rig.views.Front.parts.find(p=>p.id==='body')!.rect.x).toBeCloseTo(moved.rect.x+1,3);
  const coordinateSnapshot=(await diag(page)).rig;
  await page.getByRole('button',{name:'축소',exact:true}).click();await page.getByRole('button',{name:'맞춤',exact:true}).click();await page.setViewportSize({width:1280,height:1000});
  expect((await diag(page)).rig).toEqual(coordinateSnapshot);
  await page.locator('[data-view="Back"]').click();
  expect((await diag(page)).rig.views.Back).toEqual(before.views.Back);
  await field(page,'rect.width').fill('205');expect((await diag(page)).rig.views.Back.parts.find(p=>p.id==='body')!.rect.width).toBe(205);
  await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('0.8');
  const t=(await diag(page)).seconds;
  await page.locator('#direction').selectOption('NW');expect((await diag(page)).seconds).toBe(t);
  await page.locator('#compare').click();expect((await diag(page)).nodes).toBe(4);expect((await diag(page)).sprites).toBe(24);
  await page.locator('#play').click();await expect.poll(async()=>(await diag(page)).seconds).toBeGreaterThan(t);
  await field(page,'rect.width').fill('210');
  expect((await diag(page)).poses.find(p=>p.direction==='NW')!.parts.find(p=>p.id==='body')!.frame.width).toBe(210);
  await details(page,'pose');await field(page,'part.zIndex').fill('23');
  expect((await diag(page)).poses.find(p=>p.direction==='NW')!.parts.find(p=>p.id==='body')!.zIndex).toBe(23);
  await page.locator('#play').click();const paused=(await diag(page)).seconds;
  await field(page,'pivot.y').fill('35');expect((await diag(page)).seconds).toBe(paused);
  await page.locator('[data-action="reset"]').click();expect((await diag(page)).mode).toBe('Rest');expect((await diag(page)).seconds).toBe(0);
  expect(errors).toEqual([]);
});

test('direction presets, visibility, solo, base transforms and immediate paused rendering', async({page})=>{
  await ready(page);await page.locator('#parts [data-part="armL"]').click();
  await page.locator('#visible').uncheck();expect((await diag(page)).poses[0].parts.find(p=>p.id==='armL')!.visible).toBe(false);
  await page.locator('#visible').check();await page.locator('#solo').check();expect((await diag(page)).poses[0].parts.filter(p=>p.visible)).toHaveLength(1);await page.locator('#solo').uncheck();
  await details(page,'pose');await field(page,'rest.x').fill('150');await field(page,'part.zIndex').fill('20');
  expect((await diag(page)).poses[0].parts.find(p=>p.id==='armL')!.x).toBe(150);expect((await diag(page)).poses[0].parts.find(p=>p.id==='armL')!.zIndex).toBe(20);
  await page.locator('#direction').selectOption('SE');await details(page,'direction');
  await field(page,'correction.x').fill('30');await field(page,'correction.scaleX').fill('0.7');await field(page,'correction.skewX').fill('0.1');
  await page.locator('#flip').check();expect((await diag(page)).poses[0].scaleX).toBeLessThan(0);
  expect((await diag(page)).poses[0].parts.find(p=>p.id==='armL')!.x).toBeCloseTo(150+30*(await diag(page)).rig.views.Front.referenceSize/1254);
  await page.locator('#direction-view').selectOption('Back');expect((await diag(page)).rig.directions.SE.view).toBe('Back');
  await details(page,'motion');await field(page,'motion.lift').fill('0.03');expect((await diag(page)).rig.motion.lift).toBe(.03);
  await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('0.8');
  await page.locator('#compare').click();await page.screenshot({path:test.info().outputPath('isometric.png'),fullPage:true});
});

test('save actual download, new session import, missing-image and replacement reconnect',async({page,browser})=>{
  await ready(page);await page.locator('#parts [data-part="armL"]').click();await details(page,'image');
  await page.locator('#replacement').setInputFiles(sourceImage);await expect.poll(async()=>(await diag(page)).assets).toBe(2);
  await details(page,'pose');await field(page,'rest.x').fill('123');
  await page.locator('#direction').selectOption('SW');await details(page,'direction');await field(page,'correction.rotation').fill('0.13');
  const expected=(await diag(page)).rig;
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="save"]').click();const download=await downloadPromise;
  const json=await readFile((await download.path())!,'utf8');expect(JSON.parse(json)).toEqual(expected);expect(json).not.toContain('blob:');
  const other=await browser.newContext();const next=await other.newPage();await ready(next);await uploadJSON(next,json);
  expect((await diag(next)).rig).toEqual(expected);expect((await diag(next)).missing).toBe(2);expect((await diag(next)).sprites).toBe(0);
  await expect(next.locator('#asset-list')).toContainText('elf-front.png');
  await next.locator('#reconnect').setInputFiles(['tools/characterRig/assets/elf-front.png','tools/characterRig/assets/elf-parts-sheet.png']);
  await expect.poll(async()=>(await diag(next)).missing).toBe(0);expect((await diag(next)).rig).toEqual(expected);expect((await diag(next)).sprites).toBe(6);
  await other.close();
});

test('invalid JSON, bounds, bad files and mismatched relink retain the usable project',async({page})=>{
  await ready(page);const original=(await diag(page)).rig;
  await uploadJSON(page,'{broken');await expect(page.locator('#error')).toContainText('JSON');expect((await diag(page)).rig).toEqual(original);
  await field(page,'rect.width').fill('9000');await expect(page.locator('#error')).toBeVisible();expect((await diag(page)).rig).toEqual(original);
  await field(page,'rect.width').fill(String(original.views.Front.parts[0].rect.width));await expect(page.locator('#error')).toBeHidden();
  await page.locator('#load-image').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.locator('#error')).toBeVisible();expect((await diag(page)).rig).toEqual(original);
  const r=createRig();r.views.Front=makeView('Front',{id:'different',name:'different.png',width:100,height:200});
  await uploadJSON(page,serializeRig(r));await page.locator('input[data-relink="different"]').setInputFiles(sourceImage);await expect(page.locator('#error')).toContainText('100×200');expect((await diag(page)).missing).toBe(1);
  await page.locator('#load-image').setInputFiles(sourceImage);await expect.poll(async()=>(await diag(page)).assets).toBe(1);expect((await diag(page)).rig.views.Front.width).toBe(1254);
});

test('image replacement and editor re-entry do not accumulate listeners, sprites or assets',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);const initial=await diag(page);
  for(let i=0;i<5;i++) {
    await page.locator('#load-image').setInputFiles(sourceImage);await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
    expect((await diag(page)).assets).toBe(2);expect((await diag(page)).listeners).toBe(initial.listeners);expect((await diag(page)).sprites).toBe(6);
  }
  await details(page,'image');
  for(let i=0;i<3;i++) {await page.locator('#replacement').setInputFiles(sourceImage);await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');expect((await diag(page)).assets).toBe(3);}
  await page.locator('[data-action="remove-replacement"]').click();expect((await diag(page)).assets).toBe(2);
  await page.locator('[data-action="new"]').click();expect((await diag(page)).assets).toBe(0);expect((await diag(page)).sprites).toBe(0);
  await page.locator('#load-image').setInputFiles(sourceImage);await expect.poll(async()=>(await diag(page)).assets).toBe(1);
  await page.locator('[data-view="Back"]').click();await expect(page.locator('#source-empty')).toBeVisible();
  await page.locator('[data-action="sample"]').click();await expect.poll(async()=>(await diag(page)).assets).toBe(1);
  // Normal page teardown/re-entry must give one private application ticker, not global duplicates.
  await page.goto('about:blank');await ready(page);expect((await diag(page)).listeners).toBe(initial.listeners);expect((await diag(page)).assets).toBe(1);
  expect(errors).toEqual([]);
});

test('DPR and narrow layout preserve source coordinates and provide keyboard-accessible uploads',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const page=await context.newPage();await ready(page);
  const before=(await diag(page)).rig;
  await page.getByRole('button',{name:'확대',exact:true}).click();await page.getByRole('button',{name:'축소',exact:true}).click();expect((await diag(page)).rig).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'이미지 불러오기',exact:true}).focus();await page.keyboard.press('Enter');await (await chooser).setFiles(sourceImage);
  await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  await page.screenshot({path:test.info().outputPath('mobile.png'),fullPage:true});await context.close();
});

test('all six parts can be drawn and numerically adjusted on Front and Back; cancel releases drag',async({page})=>{
  await ready(page);
  for(const view of ['Front','Back']) {
    await page.locator(`[data-view="${view}"]`).click();
    for(const [i,id] of ['head','body','armL','armR','legL','legR'].entries()) {
      await page.locator(`#parts [data-part="${id}"]`).click();await page.getByRole('button',{name:'영역 그리기',exact:true}).click();
      const image=await page.locator('#source image').boundingBox();const sx=image!.width/1254,sy=image!.height/1254;
      const x=200+i*20,y=100+i*30;
      await page.mouse.move(image!.x+x*sx,image!.y+y*sy);await page.mouse.down();await page.mouse.move(image!.x+(x+300)*sx,image!.y+(y+400)*sy);await page.mouse.up();
      const actual=(await diag(page)).rig.views[view as 'Front'|'Back'].parts.find(p=>p.id===id)!;
      expect(Math.abs(actual.rect.x-x)).toBeLessThan(3);expect(Math.abs(actual.rect.width-300)).toBeLessThan(3);
      await field(page,'rect.width').fill('310');expect((await diag(page)).rig.views[view as 'Front'|'Back'].parts.find(p=>p.id===id)!.rect.width).toBe(310);
    }
  }
  await page.getByRole('button',{name:'영역 이동',exact:true}).click();
  await page.locator('#source svg').dispatchEvent('pointercancel',{pointerId:1});
  await page.locator('#source svg').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#error')).toBeHidden();
});

test('different-size and padded Front/Back align their displayed reference height and ground',async({page})=>{
  await ready(page);
  const payload=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=600;c.height=900;const ctx=c.getContext('2d')!;ctx.fillStyle='#80e5c4';ctx.fillRect(200,100,200,700);
    return c.toDataURL().split(',')[1];
  });
  await page.locator('[data-view="Back"]').click();await page.locator('#load-image').setInputFiles({name:'padded.png',mimeType:'image/png',buffer:Buffer.from(payload,'base64')});await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  await details(page,'view');await field(page,'ground.y').fill('800');await field(page,'view.referenceSize').fill('700');await field(page,'view.displayScale').fill('0.9');
  const back=await diag(page);expect(back.rig.views.Back.height).toBe(900);expect(back.rig.views.Back.ground.y).toBe(800);
  const backGround=back.poses[0].y;
  await page.locator('#direction').selectOption('Front');const front=await diag(page);
  expect(front.poses[0].y).toBe(backGround);
  expect(back.poses[0].scaleY/front.poses[0].scaleY).toBeCloseTo(front.rig.views.Front.referenceSize/700*.9/front.rig.views.Front.displayScale);
  // Changing ground preserves source-space placement; the source soles can be aligned to that new origin.
  for(const p of back.rig.views.Back.parts)expect(back.poses[0].parts.find(part=>part.id===p.id)!.worldY+800-p.pivot.y).toBeCloseTo(p.rect.y);
});

test('default atlas has transparent gaps, opaque costume, aligned soles and stable walk/reset',async({page})=>{
  await ready(page);const initial=await diag(page);
  expect(initial.rig.id).toBe('elf-parts-sheet');expect(initial.assets).toBe(1);expect(initial.sprites).toBe(6);
  const alpha = await page.evaluate(async()=>{
    const image=new Image();image.src=document.querySelector('#source image')!.getAttribute('href')!;await image.decode();
    const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);
    return {background:ctx.getImageData(0,0,1,1).data[3],costume:ctx.getImageData(627,655,1,1).data[3]};
  });
  expect(alpha.background).toBe(0);expect(alpha.costume).toBeGreaterThanOrEqual(250);
  await details(page,'pose');await field(page,'rest.x').fill('150');await page.locator('[data-action="reset-part"]').click();
  expect((await diag(page)).rig.views.Front.parts[0].restTransform).toEqual(initial.rig.views.Front.parts[0].restTransform);
  await page.locator('[data-mode="Walk"]').click();await page.locator('#compare').click();
  await page.locator('#phase').fill('0.2');const first=await diag(page);await page.locator('#phase').fill('0.7');const second=await diag(page);
  expect(first.nodes).toBe(4);expect(first.sprites).toBe(24);
  for(let i=0;i<4;i++) {
    expect(first.poses[i].parts.find(p=>p.id==='legL')!.y).not.toBe(second.poses[i].parts.find(p=>p.id==='legL')!.y);
    expect(first.poses[i].x).toBe(second.poses[i].x);expect(first.poses[i].y).toBe(second.poses[i].y);
  }
  await page.locator('[data-action="reset"]').click();expect((await diag(page)).rig).toEqual(initial.rig);
});

test('original JPG can be loaded with an explicit nontransparent-background notice',async({page})=>{
  await ready(page);await page.locator('[data-action="new"]').click();
  await page.locator('#load-image').setInputFiles('tools/characterRig/assets/source/elf-parts-sheet/original.jpg');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  expect((await diag(page)).rig.views.Front.image!.name).toBe('original.jpg');expect((await diag(page)).sprites).toBe(6);
  await expect(page.locator('#notice')).toContainText('JPG 배경은 자동 제거되지 않습니다.');
});
