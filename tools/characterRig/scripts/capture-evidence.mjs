// Run against the dev or production preview server: node tools/characterRig/scripts/capture-evidence.mjs [URL]
import { chromium } from '@playwright/test';
const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(new URL('/tools/characterRig/', process.argv[2] ?? 'http://127.0.0.1:5173').href);
  await page.locator('#notice').filter({hasText:'파츠 시트 기본 리그를 불러왔습니다.'}).waitFor();
  await page.locator('#preview canvas').waitFor();
  await page.screenshot({path:'tools/characterRig/docs/editor-initial.png',fullPage:true});
  await page.screenshot({path:'tools/characterRig/docs/default-front.png',fullPage:true});
  await page.locator('[data-view="Back"]').click();
  await page.screenshot({path:'tools/characterRig/docs/default-back.png',fullPage:true});
  await page.locator('[data-view="Front"]').click();
  await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('0.2');await page.locator('#compare').click();
  await page.screenshot({path:'tools/characterRig/docs/editor-isometric.png',fullPage:true});
  await page.locator('#phase').fill('0.7');
  await page.screenshot({path:'tools/characterRig/docs/editor-walk-phase-07.png',fullPage:true});
  await page.locator('[data-action="sample"]').click();
  await page.locator('#app[aria-busy="false"]').waitFor();
  await page.locator('#compare').click();
  await page.locator('details[data-section="attachment"] summary').click();
  await page.screenshot({path:'tools/characterRig/docs/hierarchy-sockets.png',fullPage:true});
  await page.locator('#parts [data-part="body"]').click();
  await page.locator('details[data-section="pose"] summary').click();
  await page.locator('input[data-path="rest.rotation"]').fill('0.22');
  await page.locator('input[data-path="rest.x"]').fill('35');
  await page.screenshot({path:'tools/characterRig/docs/hierarchy-body.png',fullPage:true});
  await page.locator('[data-action="sample"]').click();
  await page.locator('#app[aria-busy="false"]').waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tools/characterRig/docs/editor-mobile.png',fullPage:true});
} finally { await browser.close(); }
