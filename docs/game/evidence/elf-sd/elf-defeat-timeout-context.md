# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/game/tests/browser/game.spec.ts >> defeat and restart accessible with keyboard, corrupted saves recover
- Location: tests/game/tests/browser/game.spec.ts:255:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - img "높낮이 전술 전장" [ref=e4]
  - generic:
    - generic:
      - banner:
        - generic:
          - text: CHAPTER 01 · AT 7 · RT 85
          - heading "갈대의 관문" [level=2]
        - strong: PLAYER TURN
        - generic:
          - button "▦ Top view" [active] [ref=e5] [cursor=pointer]
          - button "⚙ 설정" [ref=e6] [cursor=pointer]
      - complementary [ref=e7]:
        - text: COMMAND
        - heading "행동 선택" [level=2] [ref=e8]
        - paragraph [ref=e9]: "활성 유닛: 로웬이동 1회 · 행동 1회 · 기술 1회"
        - button "⚔ 에린" [disabled] [ref=e10]
        - button "➶ 로웬 ◀ AT" [ref=e11] [cursor=pointer]
        - button "✦ 세라" [disabled] [ref=e12]
        - button "현재 AT 종료" [ref=e13] [cursor=pointer]
      - complementary [ref=e14]:
        - text: TERRAIN · 2, 4
        - heading "석조 길 · 높이 1" [level=3] [ref=e15]
        - heading "로웬" [level=2] [ref=e16]
        - paragraph [ref=e17]: 궁수 · 아군
        - paragraph [ref=e18]: HP 48 / 76MP 4 · TP 8ATK 23 · DEF 5AGI 26 · AVD 20
        - paragraph [ref=e19]: 황혼 마녀 → 세라 · 피해 35
      - generic:
        - generic:
          - text: ➶ 로웬
          - generic: 48 HP · RT 0
        - generic:
          - text: ⚔ 에린
          - generic: 82 HP · RT 5
        - generic:
          - text: ✦ 세라
          - generic: 33 HP · RT 20
        - generic:
          - text: ➶ 그늘 궁수
          - generic: 55 HP · RT 60
        - generic:
          - text: ⚔ 잿빛 기사
          - generic: 55 HP · RT 77
        - generic:
          - text: ✦ 황혼 마녀
          - generic: 55 HP · RT 92
    - contentinfo:
      - generic: Up Down 선택
      - generic: Enter 확인 / 패드 0
      - generic: Escape 뒤로 / 패드 1
      - generic: P 메뉴
      - generic: Q/E 유닛 · V 시점 · I/J/K/L 카메라 · −/+ 줌
      - generic: 적이 행동합니다…
  - generic [ref=e20]: 적이 행동합니다…
```

# Test source

```ts
  164 |     await shot(page, 'battle-top');
  165 |     await press(page, 'view');
  166 |     await press(page, 'menu');
  167 |     await choose(page, 'settings');
  168 |     await contained(page);
  169 |     await shot(page, 'settings');
  170 |     await press(page, 'cancel');
  171 |     await press(page, 'cancel');
  172 |     await win(page);
  173 |     await shot(page, 'victory');
  174 |     await choose(page, 'next-stage');
  175 |     for (const stage of [1, 2]) {
  176 |         await deploy(page, stage);
  177 |         await win(page);
  178 |         await choose(page, 'next-stage');
  179 |     }
  180 |     await expect(page.locator('#game')).toHaveAttribute('data-screen', 'ending');
  181 |     await shot(page, 'ending');
  182 |     await page.reload();
  183 |     await choose(page, 'continue');
  184 |     await expect(page.locator('.map-info')).toContainText('3 / 3');
  185 |     expect(errors).toEqual([]);
  186 | });
  187 | test('simulated standard gamepad completes battle and reconnect restores focus safely', async ({ page }) => {
  188 |     test.setTimeout(240000);
  189 |     await boot(page, true);
  190 |     await deploy(page, 0, true);
  191 |     await press(page, 'view', true);
  192 |     await press(page, 'view', true);
  193 |     await page.evaluate(() => {
  194 |         (window as unknown as {
  195 |             mockConnected: boolean;
  196 |         }).mockConnected = false;
  197 |     });
  198 |     await expect(page.getByRole('dialog')).toBeVisible();
  199 |     await page.evaluate(() => {
  200 |         (window as unknown as {
  201 |             mockConnected: boolean;
  202 |         }).mockConnected = true;
  203 |         (window as unknown as {
  204 |             mockButtons: number[];
  205 |         }).mockButtons = [0];
  206 |     });
  207 |     await frames(page);
  208 |     await choose(page, 'resume');
  209 |     expect((await diag(page)).modal).toBeNull();
  210 |     await page.evaluate(() => {
  211 |         (window as unknown as {
  212 |             mockButtons: number[];
  213 |         }).mockButtons = [];
  214 |     });
  215 |     await frames(page);
  216 |     await win(page, true);
  217 |     await choose(page, 'world', true);
  218 |     await deploy(page, 0, true);
  219 |     await press(page, 'menu', true);
  220 |     await choose(page, 'restart', true);
  221 |     expect((await diag(page)).battle?.round).toBe(1);
  222 | });
  223 | test('mapping keyboard capture, cancel, saved restore and defaults; responsive resize', async ({ page }) => {
  224 |     await boot(page);
  225 |     await press(page, 'menu');
  226 |     await choose(page, 'settings');
  227 |     await choose(page, 'bind-keys-4');
  228 |     await page.keyboard.press('z');
  229 |     expect((await diag(page)).bindings.keys.confirm).toBe('KeyZ');
  230 |     await page.keyboard.press('Escape');
  231 |     await page.keyboard.press('Escape');
  232 |     await page.reload();
  233 |     expect((await diag(page)).bindings.keys.confirm).toBe('KeyZ');
  234 |     await page.keyboard.press('z');
  235 |     await press(page, 'menu');
  236 |     for (let i = 0; i < 15; i++) {
  237 |         if (await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id) === 'settings')
  238 |             break;
  239 |         await press(page, 'down');
  240 |     }
  241 |     await page.keyboard.press('z');
  242 |     for (let i = 0; i < 60; i++) {
  243 |         if (await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id) === 'defaults')
  244 |             break;
  245 |         await press(page, 'down');
  246 |     }
  247 |     await page.keyboard.press('z');
  248 |     expect((await diag(page)).bindings).toEqual(defaults());
  249 |     await page.setViewportSize({ width: 1280, height: 900 });
  250 |     await frames(page);
  251 |     expect((await diag(page)).dimensions.backingWidth).toBe(2560);
  252 |     await contained(page);
  253 |     await shot(page, 'responsive-1280');
  254 | });
  255 | test('defeat and restart accessible with keyboard, corrupted saves recover', async ({ page }) => {
  256 |     test.setTimeout(90000);
  257 |     await page.addInitScript(() => localStorage.setItem('tacticssd.campaign', 'broken'));
  258 |     await boot(page);
  259 |     await deploy(page);
  260 |     for (let i = 0; i < 240 && (await diag(page)).screen === 'battle'; i++) { // End turn through the pause-safe selection menu using Tab focus and Space native activation.
  261 |         await press(page, 'menu');
  262 |         await choose(page, 'finish-turn');
  263 |         await press(page, 'confirm');
> 264 |         await expect.poll(async () => { const d = await diag(page); return d.screen === 'result' || d.battle?.phase === 'ally' && d.mode !== 'animating'; }).toBe(true);
      |                                                                                                                                                              ^ Error: expect(received).toBe(expected) // Object.is equality
  265 |     }
  266 |     expect((await diag(page)).battle?.phase).toBe('lost');
  267 |     await choose(page, 'restart');
  268 |     expect((await diag(page)).battle?.round).toBe(1);
  269 | });
  270 | test('gamepad button remap persists, modal traps focus, moving view stays on same logical tile', async ({ page }) => {
  271 |     const errors: string[] = [];
  272 |     page.on('pageerror', e => errors.push(e.message));
  273 |     await boot(page, true);
  274 |     await deploy(page, 0, true);
  275 |     await press(page, 'next', true);
  276 |     await choose(page, 'move', true);
  277 |     await press(page, 'confirm', true); // Confirming the current tile is a safe no-op.
  278 |     expect((await diag(page)).mode).toBe('command');
  279 |     expect(errors).toEqual([]);
  280 |     await choose(page, 'move', true);
  281 |     await press(page, 'right', true);
  282 |     await press(page, 'down', true);
  283 |     await press(page, 'right', true);
  284 |     const before = (await diag(page)).cursor;
  285 |     const during = await page.evaluate(() => new Promise<{
  286 |         mode: string;
  287 |         top: boolean;
  288 |         cursor: {
  289 |             x: number;
  290 |             y: number;
  291 |         };
  292 |     }>(resolve => {
  293 |         const w = window as unknown as {
  294 |             mockButtons: number[];
  295 |             tacticsDiagnostics: () => {
  296 |                 mode: string;
  297 |                 top: boolean;
  298 |                 cursor: {
  299 |                     x: number;
  300 |                     y: number;
  301 |                 };
  302 |             };
  303 |         };
  304 |         w.mockButtons = [0, 3];
  305 |         requestAnimationFrame(() => { const state = w.tacticsDiagnostics(); w.mockButtons = []; resolve(state); });
  306 |     }));
  307 |     expect(during.mode).toBe('walking');
  308 |     expect(during.top).toBe(true);
  309 |     expect(during.cursor).toEqual(before);
  310 |     await frames(page);
  311 |     await press(page, 'menu', true);
  312 |     const state = (await diag(page)).top;
  313 |     await press(page, 'view', true);
  314 |     expect((await diag(page)).top).toBe(state);
  315 |     await choose(page, 'settings', true);
  316 |     await choose(page, 'bind-buttons-4', true);
  317 |     await page.evaluate(() => {
  318 |         (window as unknown as {
  319 |             mockButtons: number[];
  320 |         }).mockButtons = [2];
  321 |     });
  322 |     await frames(page);
  323 |     await page.evaluate(() => {
  324 |         (window as unknown as {
  325 |             mockButtons: number[];
  326 |         }).mockButtons = [];
  327 |     });
  328 |     await frames(page);
  329 |     expect((await diag(page)).bindings.buttons.confirm).toBe(2);
  330 |     await press(page, 'cancel', true);
  331 |     await press(page, 'cancel', true);
  332 |     await expect.poll(async () => (await diag(page)).mode).toBe('command');
  333 |     await page.reload();
  334 |     expect((await diag(page)).bindings.buttons.confirm).toBe(2);
  335 | });
  336 | test('generated rig opens in existing editor, animates four directions and saves v2 without altering original presets', async ({ page }) => {
  337 |     await page.goto('/tools/characterRig/');
  338 |     await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  339 |     await page.locator('#load-json').setInputFiles('game/assets/dawn-rig.json');
  340 |     await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  341 |     await page.locator('#reconnect').setInputFiles('game/assets/dawn-parts.png');
  342 |     await expect.poll(() => page.evaluate(() => window.rigDiagnostics().missing)).toBe(0);
  343 |     await page.locator('[data-mode="Walk"]').click();
  344 |     await page.locator('#compare').click();
  345 |     await page.locator('#phase').fill('0.25');
  346 |     expect(await page.evaluate(() => window.rigDiagnostics().sprites)).toBe(24);
  347 |     await page.locator('#preview').screenshot({ path: 'docs/game/evidence/generated-rig-four-directions.png' });
  348 |     await page.locator('#parts [data-part="body"]').click();
  349 |     await page.locator('input[data-path="pivot.y"]').fill('36');
  350 |     const download = page.waitForEvent('download');
  351 |     await page.locator('[data-action="save"]').click();
  352 |     const result = await download;
  353 |     const { readFile } = await import('node:fs/promises');
  354 |     const saved = JSON.parse(await readFile((await result.path())!, 'utf8'));
  355 |     expect(saved.schemaVersion).toBe(2);
  356 |     expect(saved.views.Front.parts.find((p: {
  357 |         id: string;
  358 |     }) => p.id === 'body').pivot.y).toBe(36);
  359 | });
  360 | 
```