import { test, expect } from '@playwright/test';

async function rigReady(page: import('@playwright/test').Page) {
  await expect(page).toHaveURL(/\/tools\/characterRig\/$/);
  await expect(page.locator('#notice')).toContainText('파츠 시트 기본 리그를 불러왔습니다.');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#preview canvas')).toHaveCount(1);
}

test('main loads independently, buttons navigate into the tool and back without duplicate renderers', async ({ page }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('TacticsSD · 제작 도구');
  await expect(page.getByRole('heading', { name: '작업에 필요한 도구를 선택하세요.' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requests.some(url => /pixi|characterRig\/(main|assets)/i.test(url))).toBe(false);

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '캐릭터 리깅 열기' }).click();
    await rigReady(page);
    await expect(page).toHaveTitle('TacticsSD · Character Rig Studio');
    const diagnostics = await page.evaluate(() => window.rigDiagnostics());
    expect(diagnostics.listeners).toBe(2);
    expect(diagnostics.assets).toBe(1);
    expect(diagnostics.sprites).toBe(6);
    await page.getByRole('button', { name: '메인으로' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: '캐릭터 리깅 열기' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.evaluate(() => typeof window.rigDiagnostics)).toBe('undefined');
  }
  expect(errors).toEqual([]);
});

test('tool supports direct links, reload, browser back and forward', async ({ page }) => {
  await page.goto('/tools/characterRig/');
  await rigReady(page);
  await page.reload();
  await rigReady(page);
  await page.getByRole('button', { name: '메인으로' }).click();
  await expect(page.getByRole('button', { name: '캐릭터 리깅 열기' })).toBeVisible();
  await page.goBack();
  await rigReady(page);
  await page.goForward();
  await expect(page.getByRole('heading', { name: '작업에 필요한 도구를 선택하세요.' })).toBeVisible();
});

test('leaving an edited rig can be cancelled to keep the draft', async ({ page }) => {
  await page.goto('/tools/characterRig/');
  await rigReady(page);
  await page.locator('input[data-path="rect.height"]').fill('395');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: '메인으로' }).click();
  await expect(page).toHaveURL(/\/tools\/characterRig\/$/);
  await expect(page.locator('input[data-path="rect.height"]')).toHaveValue('395');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '메인으로' }).click();
  await expect(page.getByRole('button', { name: '캐릭터 리깅 열기' })).toBeVisible();
});

test('main page and tool entry remain keyboard accessible at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '캐릭터 리깅 열기' }).focus();
  await page.keyboard.press('Enter');
  await rigReady(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: '메인으로' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '캐릭터 리깅 열기' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
