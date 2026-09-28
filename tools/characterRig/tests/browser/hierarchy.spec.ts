import { test, expect, type Page } from '@playwright/test';
import { evaluateWorldRig } from '../../domain/animator';
import type { DirectionId } from '../../domain/rig';
const diag=(page:Page)=>page.evaluate(()=>window.rigDiagnostics());
const field=(page:Page,path:string)=>page.locator(`input[data-path="${path}"]`);
const open=async(page:Page,id:string)=>{const details=page.locator(`details[data-section="${id}"]`);if(await details.getAttribute('open')===null)await details.locator('summary').click();};
const ready=async(page:Page)=>{await page.goto('/tools/characterRig/');await expect(page.locator('#notice')).toContainText('파츠 시트 기본 리그');await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');};

test('body editing moves every joint in both views and all isometric directions without mutating child settings',async({page})=>{
  await ready(page);
  for(const view of ['Front','Back'] as const) {
    await page.locator(`[data-view="${view}"]`).click();await page.locator('#parts [data-part="body"]').click();await open(page,'pose');
    const before=(await diag(page)).rig.views[view].parts.filter(p=>p.id!=='body');
    await field(page,'rest.x').fill('35');await field(page,'rest.y').fill('-20');await field(page,'rest.rotation').fill('0.3');await field(page,'rest.scaleX').fill('1.1');
    const current=await diag(page);expect(current.rig.views[view].parts.filter(p=>p.id!=='body')).toEqual(before);
    for(const p of current.poses[0].parts.filter(p=>p.id!=='body')) {
      expect(p.parentId).toBe('body');expect(p.worldX).toBeCloseTo(p.socketWorldX);expect(p.worldY).toBeCloseTo(p.socketWorldY);
    }
  }
  await page.locator('#compare').click();await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('0.7');
  const snapshot=await diag(page);
  for(const pose of snapshot.poses) {
    const expected=evaluateWorldRig(snapshot.rig,pose.direction as DirectionId,snapshot.seconds,'Walk');
    for(const p of pose.parts) {
      expect(p.worldX).toBeCloseTo(expected.find(e=>e.id===p.id)!.x,5);expect(p.worldY).toBeCloseTo(expected.find(e=>e.id===p.id)!.y,5);
    }
  }
});

test('socket numeric and drag editing, crop independence and invalid socket recovery',async({page})=>{
  await ready(page);const original=await diag(page);await open(page,'attachment');
  const head=original.rig.views.Front.parts.find(p=>p.id==='head')!;
  await field(page,'socket.x').fill(String(head.attachment.socket.x+12));
  expect((await diag(page)).poses[0].parts.find(p=>p.id==='head')!.worldX).toBeCloseTo(12);
  const handle=await page.locator('#source circle[data-action="socket"]').boundingBox(),image=await page.locator('#source image').boundingBox();
  await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();await page.mouse.move(handle!.x+handle!.width/2+10*image!.width/1254,handle!.y+handle!.height/2);await page.mouse.up();
  expect((await diag(page)).rig.views.Front.parts[0].attachment.socket.x).toBeCloseTo(head.attachment.socket.x+22,0);
  const before=await diag(page);await field(page,'rect.x').fill(String(head.rect.x+10));
  expect((await diag(page)).poses[0].parts.find(p=>p.id==='head')!.worldX).toBeCloseTo(before.poses[0].parts.find(p=>p.id==='head')!.worldX);
  const valid=(await diag(page)).rig;await field(page,'socket.x').fill('100001');await expect(page.locator('#error')).toBeVisible();expect((await diag(page)).rig).toEqual(valid);
  await field(page,'socket.x').fill(String(head.attachment.socket.x));await expect(page.locator('#error')).toBeHidden();
});

test('obsolete and future rig files are rejected without losing edits; current files still round-trip',async({page})=>{
  await ready(page);await open(page,'attachment');await field(page,'socket.x').fill('180');
  const before=await diag(page);
  for (const schemaVersion of [1,3]) {
    await page.locator('#load-json').setInputFiles({name:'unsupported.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion}))});
    await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('#error')).toContainText('현재 v2');
    await expect(page.locator('#error')).toContainText('새 리그');
    const after=await diag(page);expect(after.rig).toEqual(before.rig);expect(after.assets).toBe(before.assets);expect(after.poses).toEqual(before.poses);
  }
  const dl=page.waitForEvent('download');await page.locator('[data-action="save"]').click();const download=await dl;
  await page.locator('#load-json').setInputFiles((await download.path())!);await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  expect((await diag(page)).rig).toEqual(before.rig);
  await page.locator('#reconnect').setInputFiles('tools/characterRig/assets/elf-parts-sheet.png');await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');
  expect((await diag(page)).poses).toEqual(before.poses);
});
