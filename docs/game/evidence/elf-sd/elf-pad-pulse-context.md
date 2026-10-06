# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/game/tests/browser/game.spec.ts >> simulated standard gamepad completes battle and reconnect restores focus safely
- Location: tests/game/tests/browser/game.spec.ts:187:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "command"
Received: "move"

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
          - text: CHAPTER 01 · AT 11 · RT 263
          - heading "갈대의 관문" [level=2]
        - strong: PLAYER TURN
        - generic:
          - button "▦ Top view" [active] [ref=e5] [cursor=pointer]
          - button "⚙ 설정" [ref=e6] [cursor=pointer]
      - complementary [ref=e7]:
        - text: MOVE
        - heading "에린" [level=2] [ref=e8]
        - paragraph [ref=e9]: "방향키 / 왼쪽 스틱확인: 이동 확정취소: 명령으로"
      - complementary [ref=e10]:
        - text: TERRAIN · 7, 6
        - heading "초지 · 높이 1" [level=3] [ref=e11]
        - paragraph [ref=e12]: 그늘 궁수 → 로웬 · 피해 29
      - generic:
        - generic:
          - text: ⚔ 에린
          - generic: 100 HP · RT 0
        - generic:
          - text: ➶ 그늘 궁수
          - generic: 5 HP · RT 92
        - generic:
          - text: ➶ 로웬
          - generic: 18 HP · RT 107
    - contentinfo:
      - generic: Up Down 선택
      - generic: Enter 확인 / 패드 0
      - generic: Escape 뒤로 / 패드 1
      - generic: P 메뉴
      - generic: Q/E 유닛 · V 시점 · I/J/K/L 카메라 · −/+ 줌
      - generic: 이동할 수 없는 타일입니다.
  - generic [ref=e13]: 이동할 수 없는 타일입니다.
```

# Test source

```ts
  15  |     top: boolean;
  16  |     bindings: Bindings;
  17  |     dimensions: {
  18  |         width: number;
  19  |         height: number;
  20  |         backingWidth: number;
  21  |         backingHeight: number;
  22  |         dpr: number;
  23  |     };
  24  | };
  25  | const diag = (p: Page) => p.evaluate(() => (window as unknown as {
  26  |     tacticsDiagnostics: () => D;
  27  | }).tacticsDiagnostics());
  28  | const frames = (p: Page) => p.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  29  | async function press(p: Page, a: Action, pad = false) {
  30  |     if (pad) {
  31  |         const n = defaults().buttons[a];
  32  |         if (n < 0)
  33  |             throw Error('No digital binding ' + a);
  34  |         await p.evaluate(n => {
  35  |             (window as unknown as {
  36  |                 mockButtons: number[];
  37  |             }).mockButtons = [n];
  38  |         }, n);
  39  |         await frames(p);
  40  |         await p.evaluate(() => {
  41  |             (window as unknown as {
  42  |                 mockButtons: number[];
  43  |             }).mockButtons = [];
  44  |         });
  45  |         await frames(p);
  46  |     }
  47  |     else
  48  |         await p.keyboard.press(defaults().keys[a].replace('Key', ''));
  49  | }
  50  | async function choose(p: Page, id: string, pad = false) {
  51  |     for (let i = 0; i < 80; i++) {
  52  |         const active = await p.evaluate(() => (document.activeElement as HTMLElement)?.dataset.id);
  53  |         if (active === id) {
  54  |             await press(p, 'confirm', pad);
  55  |             return;
  56  |         }
  57  |         await press(p, 'down', pad);
  58  |     }
  59  |     throw Error('Unreachable focus ' + id + ' ' + JSON.stringify(await diag(p)));
  60  | }
  61  | async function boot(p: Page, pad = false) {
  62  |     if (pad)
  63  |         await p.addInitScript(() => {
  64  |             const w = window as unknown as {
  65  |                 mockButtons: number[];
  66  |                 mockConnected: boolean;
  67  |             };
  68  |             w.mockButtons = [];
  69  |             w.mockConnected = true;
  70  |             Object.defineProperty(navigator, 'getGamepads', { value: () => w.mockConnected ? [{ id: 'Simulated standard controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: w.mockButtons.includes(i), value: w.mockButtons.includes(i) ? 1 : 0 })) }] : [] });
  71  |         });
  72  |     await p.goto('/game/');
  73  |     await expect(p.locator('[data-id="new"]')).toBeFocused();
  74  |     await choose(p, 'new', pad);
  75  | }
  76  | async function deploy(p: Page, stage = 0, pad = false) { await choose(p, 'stage-' + stage, pad); await choose(p, 'party', pad); await choose(p, 'deploy', pad); await choose(p, 'talk-0', pad); await choose(p, 'talk-0', pad); await expect(p.locator('#game')).toHaveAttribute('data-screen', 'battle'); }
  77  | async function win(p: Page, pad = false) {
  78  |     for (let step = 0; step < 220; step++) {
  79  |         let d = await diag(p);
  80  |         if (d.screen === 'result') {
  81  |             expect(d.battle?.phase).toBe('won');
  82  |             return;
  83  |         }
  84  |         if (d.mode === 'animating' || d.battle!.phase === 'enemy') {
  85  |             await expect.poll(async () => { const d = await diag(p); return d.screen === 'result' || d.mode !== 'animating' && d.battle?.phase !== 'enemy'; }, { timeout: 15000 }).toBe(true);
  86  |             continue;
  87  |         }
  88  |         if (d.mode === 'facing') {
  89  |             await press(p, 'confirm', pad);
  90  |             continue;
  91  |         }
  92  |         if (d.selected && d.battle!.units.find(u => u.id === d.selected)?.acted) {
  93  |             await choose(p, 'wait', pad);
  94  |             await press(p, 'confirm', pad);
  95  |             continue;
  96  |         }
  97  |         await press(p, 'next', pad);
  98  |         d = await diag(p);
  99  |         const b = d.battle!, u = b.units.find(u => u.id === d.selected)!;
  100 |         expect(u).toBeTruthy();
  101 |         const enemies = b.units.filter(v => v.team === 'enemy' && v.hp > 0);
  102 |         const positions = reachable(b, u).sort((a, z) => Math.min(...enemies.map(v => distance(a, v))) - Math.min(...enemies.map(v => distance(z, v))));
  103 |         const available = (pos: {
  104 |             x: number;
  105 |             y: number;
  106 |         }) => { const c = { ...u, ...pos }; return targets(b, c, 'skill').filter(t => t.team !== u.team).length || targets(b, c, 'attack').length; };
  107 |         const destination = positions.filter(available).reverse()[0] ?? positions[0];
  108 |         if (destination.x !== u.x || destination.y !== u.y) {
  109 |             await choose(p, 'move', pad);
  110 |             for (let n = 0; n < Math.abs(destination.x - u.x); n++)
  111 |                 await press(p, destination.x > u.x ? 'right' : 'left', pad);
  112 |             for (let n = 0; n < Math.abs(destination.y - u.y); n++)
  113 |                 await press(p, destination.y > u.y ? 'down' : 'up', pad);
  114 |             await press(p, 'confirm', pad);
> 115 |             await expect.poll(async () => (await diag(p)).mode).toBe('command');
      |                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  116 |             d = await diag(p);
  117 |         }
  118 |         const current = d.battle!.units.find(v => v.id === d.selected)!;
  119 |         const injured = targets(d.battle!, current, 'item').filter(t => t.maxHp - t.hp >= 35).sort((a, z) => a.hp - z.hp);
  120 |         const cmd = injured.length ? 'item' : targets(d.battle!, current, 'skill').some(t => t.team !== current.team) ? 'skill' : targets(d.battle!, current, 'attack').length ? 'attack' : 'wait';
  121 |         await choose(p, cmd, pad);
  122 |         if (cmd !== 'wait') {
  123 |             const ts = targets(d.battle!, current, cmd);
  124 |             const chosen = cmd === 'item' ? injured[0] : [...ts].sort((a, z) => a.hp - z.hp)[0];
  125 |             for (let i = 0; i < ts.findIndex(t => t.id === chosen.id); i++)
  126 |                 await press(p, 'right', pad);
  127 |             await press(p, 'confirm', pad);
  128 |         }
  129 |     }
  130 |     throw Error('Combat exceeded bounded planner');
  131 | }
  132 | async function shot(p: Page, name: string) { await p.screenshot({ path: `docs/game/evidence/${name}.png` }); }
  133 | async function contained(p: Page) { const bad = await p.locator('button:visible').evaluateAll(els => els.filter(e => !e.closest('[inert]')).filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight; }).map(e => e.textContent)); expect(bad).toEqual([]); }
  134 | test('keyboard full campaign, equipment, save and real 1024x768 DPR2 screenshots', async ({ page }) => {
  135 |     test.setTimeout(300000);
  136 |     const errors: string[] = [];
  137 |     page.on('pageerror', e => errors.push(e.message));
  138 |     await boot(page);
  139 |     await shot(page, 'world');
  140 |     await choose(page, 'stage-0');
  141 |     await choose(page, 'party');
  142 |     await shot(page, 'party');
  143 |     await choose(page, 'equipment');
  144 |     await choose(page, 'gear-weapon-1');
  145 |     await shot(page, 'equipment');
  146 |     for (const h of [0, 1, 2]) {
  147 |         await choose(page, 'hero-' + h);
  148 |         await choose(page, 'gear-weapon-1');
  149 |         await choose(page, 'gear-armor-1');
  150 |     }
  151 |     await choose(page, 'party');
  152 |     await choose(page, 'items');
  153 |     await contained(page);
  154 |     await choose(page, 'party');
  155 |     await choose(page, 'deploy');
  156 |     await shot(page, 'dialogue');
  157 |     await choose(page, 'talk-1');
  158 |     await choose(page, 'talk-0');
  159 |     await shot(page, 'battle-isometric');
  160 |     expect((await diag(page)).dimensions).toEqual({ width: 1024, height: 768, backingWidth: 2048, backingHeight: 1536, dpr: 2 });
  161 |     const cursor = (await diag(page)).cursor;
  162 |     await press(page, 'view');
  163 |     expect((await diag(page)).cursor).toEqual(cursor);
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
```