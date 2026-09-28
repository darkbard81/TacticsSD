import { test, expect } from '@playwright/test';

test('separable PNG reconstructs pixel-for-pixel in the real Pixi renderer, including pivot edits', async({page}) => {
  await page.goto('/tools/characterRig/');
  const result=await page.evaluate(async()=>{
    const path='/tools/characterRig/tests/fixtures/renderer-harness.ts';
    return (await import(/* @vite-ignore */ path)).verifyPixels();
  });
  expect(result.initial.count).toBe(0);expect(result.afterPivot.count).toBe(0);expect(result.remainingAssets).toBe(0);expect(result.initialListeners).toBe(2);expect(result.framesAfterDestroy).toBe(0);expect(result.activeFrames).toBeGreaterThan(0);
});

test('hierarchy inherits rotation while global layer order, parent hiding and child solo remain independent',async({page})=>{
  await page.goto('/tools/characterRig/');
  const r=await page.evaluate(async()=>{
    const path='/tools/characterRig/tests/fixtures/renderer-harness.ts';return (await import(/* @vite-ignore */ path)).verifyHierarchyPixels();
  });
  expect(r.headInFront).toEqual([0,0,255,255]);expect(r.bodyInFront).toEqual([255,0,0,255]);
  expect(r.hiddenBody).toEqual([0,0,255,255]);expect(r.soloHead).toEqual([0,0,255,255]);expect(r.rotated).toEqual([0,0,255,255]);
  expect(r.parentId).toBe('body');expect(r.headWorld.x).toBeCloseTo(18);expect(r.headWorld.y).toBeCloseTo(7);
});
