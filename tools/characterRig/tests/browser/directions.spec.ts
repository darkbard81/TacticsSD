import { test, expect, type Page } from '@playwright/test';
const diag = (page: Page) => page.evaluate(() => window.rigDiagnostics());
const field = (page: Page, path: string) => page.locator(`input[data-path="${path}"]`);
const open = async (page: Page, section: string) => {
  const details = page.locator(`details[data-section="${section}"]`);
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
};

test('upright defaults, mirrored joints, targeted reset and saved custom directions', async ({ page }) => {
  await page.goto('/tools/characterRig/');
  await expect(page.locator('#notice')).toContainText('파츠 시트 기본 리그');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  const original = await diag(page);
  await page.locator('#compare').click();
  const rest = await diag(page);
  for (const [east, west] of [['SE', 'SW'], ['NE', 'NW']]) {
    const a = rest.poses.find(p => p.direction === east)!, b = rest.poses.find(p => p.direction === west)!;
    expect(a.scaleX).toBe(a.scaleY); expect(b.scaleX).toBe(-b.scaleY);
    for (const p of a.parts) {
      const q = b.parts.find(q => q.id === p.id)!;
      expect(q.frame).toEqual(p.frame);
      expect(q.worldX).toBeCloseTo(p.worldX); expect(q.worldY).toBeCloseTo(p.worldY);
      expect(p.worldX * a.scaleX).toBeCloseTo(-q.worldX * b.scaleX);
      expect(p.worldY * a.scaleY).toBeCloseTo(q.worldY * b.scaleY);
      expect(p.scaleX).toBe(p.id === 'body' ? Math.sqrt(5 / 8) : 1); expect(p.scaleY).toBe(1); expect(p.rotation).toBe(0);
    }
  }
  await page.screenshot({ path: test.info().outputPath('cardguild-defaults-rest.png'), fullPage: true });
  await page.locator('[data-mode="Walk"]').click(); await page.locator('#phase').fill('0.7');
  await page.screenshot({ path: test.info().outputPath('cardguild-defaults-walk.png'), fullPage: true });
  await page.locator('[data-action="reset"]').click();
  expect((await diag(page)).rig).toEqual(original.rig);

  await page.locator('#direction').selectOption('SW'); await open(page, 'direction');
  await field(page, 'correction.x').fill('32');
  await page.locator('#parts [data-part="body"]').click();
  await field(page, 'correction.scaleX').fill('0.75'); await field(page, 'correction.skewY').fill('0.16');
  await page.locator('#flip').uncheck(); await field(page, 'vector.x').fill('-0.6');
  const custom = (await diag(page)).rig;
  const savedPoses = (await diag(page)).poses;
  const dl = page.waitForEvent('download'); await page.locator('[data-action="save"]').click();
  const download = await dl;
  await page.locator('[data-action="new"]').click();
  await page.locator('#load-json').setInputFiles((await download.path())!);
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  expect((await diag(page)).rig).toEqual(custom);
  await page.locator('#reconnect').setInputFiles('tools/characterRig/assets/elf-parts-sheet.png');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  // Compare remains enabled across imports; returning to the same direction restores the same scene.
  await page.locator('#direction').selectOption('SW');
  expect((await diag(page)).poses).toEqual(savedPoses);
  await page.screenshot({ path: test.info().outputPath('custom-restored.png'), fullPage: true });
  await page.locator('#parts [data-part="body"]').click(); await open(page, 'direction');
  await page.locator('[data-action="reset-direction"]').click();
  const expected = structuredClone(custom);
  expected.directions.SW.parts.body = original.rig.directions.SW.parts.body;
  expect((await diag(page)).rig).toEqual(expected);
  expect((await diag(page)).rig.directions.SW.parts.head.x).toBe(32);
  await open(page, 'pose'); await page.locator('[data-action="reset-all"]').click();
  expect((await diag(page)).rig.directions).toEqual(expected.directions);
  await page.locator('[data-action="new"]').click();
  expect((await diag(page)).rig.directions).toEqual(original.rig.directions);
  await page.locator('[data-action="sample"]').click();
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  expect((await diag(page)).rig).toEqual(original.rig);
});
