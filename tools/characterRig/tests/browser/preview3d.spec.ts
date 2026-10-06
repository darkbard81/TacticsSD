import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.use({ launchOptions: { args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] }, deviceScaleFactor: 2 });
test('3D default texture volume, playback, orbit, resize and repeated toggles preserve rig', async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/characterRig/');
  await expect.poll(()=>page.evaluate(()=>window.rigDiagnostics().assets)).toBe(1);
  await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  const original=await page.evaluate(()=>window.rigDiagnostics().rig);
  await page.locator('#preview-kind').selectOption('3D');
  await expect(page.locator('#error'), 'WebGL2 is required for the actual 3D rendering gate').toBeHidden();
  const state=()=>page.evaluate(()=> (window.rigDiagnostics() as unknown as {preview3d:{active:boolean;bones:{id:string;parent:string|null;z:number;thickness:number;meshes:number}[];calls:number;canvas:{width:number;height:number};memory:{geometries:number;textures:number}}}).preview3d);
  await expect.poll(async()=>(await state()).calls).toBeGreaterThan(0);
  expect((await state()).bones).toHaveLength(6);
  expect((await state()).bones.filter(b=>b.parent==='body')).toHaveLength(5);
  expect((await state()).bones.every(b=>b.thickness>0&&b.meshes===3)).toBe(true);
  const memory=(await state()).memory;
  await mkdir('tools/characterRig/docs/3d',{recursive:true});
  for(const camera of ['Front','Back','Side','Isometric']){
    await page.locator(`[data-camera="${camera}"]`).click();
    await page.locator('#preview').screenshot({path:`tools/characterRig/docs/3d/${camera.toLowerCase()}.png`});
  }
  await page.locator('[data-mode="Idle"]').click();await page.locator('#phase').fill('.25');
  await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('.15');
  const a=(await state()).bones.map(b=>b.z);
  await page.locator('#phase').fill('.65');expect((await state()).bones.map(b=>b.z)).not.toEqual(a);
  await page.locator('#preview').screenshot({path:'tools/characterRig/docs/3d/walk.png'});
  await page.locator('#play').click();const t=await page.evaluate(()=>window.rigDiagnostics().seconds);
  await expect.poll(()=>page.evaluate(()=>window.rigDiagnostics().seconds)).toBeGreaterThan(t+.1);await page.locator('#play').click();
  const box=await page.locator('#preview').boundingBox();await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+65,box!.y+box!.height/2+20);await page.mouse.up();
  for(let i=0;i<3;i++){
    await page.locator('#preview-kind').selectOption('2D');await expect(page.locator('#preview canvas[data-preview="3d"]')).toBeHidden();
    await page.setViewportSize({width:1024+i*10,height:768});await page.locator('#preview-kind').selectOption('3D');
    await expect(page.locator('#preview canvas[data-preview="3d"]')).toBeVisible();
  }
  await expect.poll(async()=>(await state()).memory).toEqual(memory);
  expect(await page.evaluate(()=>window.rigDiagnostics().rig)).toEqual(original);
  await page.locator('#preview-kind').selectOption('2D');expect(await page.locator('#preview canvas:visible').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('WebGL2 failure preserves the original 2D preview and JSON', async({page})=>{
  await page.goto('/tools/characterRig/');
  await expect.poll(()=>page.evaluate(()=>window.rigDiagnostics().assets)).toBe(1);
  const original=await page.evaluate(()=>window.rigDiagnostics().rig);
  await page.evaluate(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if(kind==='webgl2') return null;
      return (original as unknown as (this: HTMLCanvasElement, kind: string, ...args: unknown[]) => RenderingContext | null).call(this,kind,...args);
    } as typeof original;
  });
  await page.locator('#preview-kind').selectOption('3D');
  await expect(page.locator('#preview-kind')).toHaveValue('2D');
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#preview canvas').first()).toBeVisible();
  expect(await page.evaluate(()=>window.rigDiagnostics().rig)).toEqual(original);
});
