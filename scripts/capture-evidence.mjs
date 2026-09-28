// Run against the dev or production preview server: node scripts/capture-evidence.mjs [URL]
import { chromium } from '@playwright/test';
const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173');
  await page.locator('#notice').filter({hasText:'엘프 병사 샘플을 불러왔습니다.'}).waitFor();
  await page.locator('#preview canvas').waitFor();
  await page.screenshot({path:'docs/editor-initial.png',fullPage:true});
  await page.locator('[data-mode="Walk"]').click();await page.locator('#phase').fill('0.8');await page.locator('#compare').click();
  await page.screenshot({path:'docs/editor-isometric.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'docs/editor-mobile.png',fullPage:true});
} finally { await browser.close(); }
