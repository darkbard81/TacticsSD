import { test, expect } from '@playwright/test';

test('separable PNG reconstructs pixel-for-pixel in the real Pixi renderer, including pivot edits', async({page}) => {
  await page.goto('/tools/characterRig/');
  const result=await page.evaluate(async()=>{
    const path='/tools/characterRig/tests/fixtures/renderer-harness.ts';
    return (await import(/* @vite-ignore */ path)).verifyPixels();
  });
  expect(result.initial.count).toBe(0);expect(result.afterPivot.count).toBe(0);expect(result.remainingAssets).toBe(0);expect(result.initialListeners).toBe(2);expect(result.framesAfterDestroy).toBe(0);expect(result.activeFrames).toBeGreaterThan(0);
});
