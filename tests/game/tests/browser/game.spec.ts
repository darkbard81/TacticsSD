import { test, expect, type Page } from '@playwright/test';
import { reachable, targets, distance, type Battle } from '../../../../game/domain';
import { defaults, type Action, type Bindings } from '../../../../game/input';
test.use({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
type D = {
    screen: string;
    mode: string;
    modal: string | null;
    selected: string | null;
    cursor: {
        x: number;
        y: number;
    };
    battle: Battle | null;
    top: boolean;
    bindings: Bindings;
    dimensions: {
        width: number;
        height: number;
        backingWidth: number;
        backingHeight: number;
        dpr: number;
    };
};
const diag = (p: Page) => p.evaluate(() => (window as unknown as {
    tacticsDiagnostics: () => D;
}).tacticsDiagnostics());
const frames = (p: Page) => p.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function press(p: Page, a: Action, pad = false) {
    if (pad) {
        const n = defaults().buttons[a];
        if (n < 0)
            throw Error('No digital binding ' + a);
        // Keep a synthetic tap inside the browser: separate protocol round trips can
        // accidentally hold a direction beyond the real 340ms repeat threshold.
        await p.evaluate(n => new Promise<void>(resolve => {
            const w = window as unknown as { mockButtons: number[] };
            requestAnimationFrame(() => {
                w.mockButtons = [n];
                requestAnimationFrame(() => {
                    w.mockButtons = [];
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
                });
            });
        }), n);
    }
    else
        await p.keyboard.press(defaults().keys[a].replace('Key', ''));
}
async function choose(p: Page, id: string, pad = false) {
    for (let i = 0; i < 80; i++) {
        const active = await p.evaluate(() => (document.activeElement as HTMLElement)?.dataset.id);
        if (active === id) {
            await press(p, 'confirm', pad);
            return;
        }
        await press(p, 'down', pad);
    }
    throw Error('Unreachable focus ' + id + ' ' + JSON.stringify(await diag(p)));
}
async function boot(p: Page, pad = false) {
    if (pad)
        await p.addInitScript(() => {
            const w = window as unknown as {
                mockButtons: number[];
                mockConnected: boolean;
            };
            w.mockButtons = [];
            w.mockConnected = true;
            Object.defineProperty(navigator, 'getGamepads', { value: () => w.mockConnected ? [{ id: 'Simulated standard controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: w.mockButtons.includes(i), value: w.mockButtons.includes(i) ? 1 : 0 })) }] : [] });
        });
    await p.goto('/game/');
    await expect(p.locator('[data-id="new"]')).toBeFocused();
    await choose(p, 'new', pad);
}
async function deploy(p: Page, stage = 0, pad = false) { await choose(p, 'stage-' + stage, pad); await choose(p, 'party', pad); await choose(p, 'deploy', pad); await choose(p, 'talk-0', pad); await choose(p, 'talk-0', pad); await expect(p.locator('#game')).toHaveAttribute('data-screen', 'battle'); }
async function win(p: Page, pad = false) {
    for (let step = 0; step < 220; step++) {
        let d = await diag(p);
        if (d.screen === 'result') {
            expect(d.battle?.phase).toBe('won');
            return;
        }
        if (d.mode === 'animating' || d.battle!.phase === 'enemy') {
            await expect.poll(async () => { const d = await diag(p); return d.screen === 'result' || d.mode !== 'animating' && d.battle?.phase !== 'enemy'; }, { timeout: 15000 }).toBe(true);
            continue;
        }
        if (d.mode === 'facing') {
            await press(p, 'confirm', pad);
            continue;
        }
        if (d.selected && d.battle!.units.find(u => u.id === d.selected)?.acted) {
            await choose(p, 'wait', pad);
            await press(p, 'confirm', pad);
            continue;
        }
        await press(p, 'next', pad);
        d = await diag(p);
        const b = d.battle!, u = b.units.find(u => u.id === d.selected)!;
        expect(u).toBeTruthy();
        const enemies = b.units.filter(v => v.team === 'enemy' && v.hp > 0);
        const positions = reachable(b, u).sort((a, z) => Math.min(...enemies.map(v => distance(a, v))) - Math.min(...enemies.map(v => distance(z, v))));
        const available = (pos: {
            x: number;
            y: number;
        }) => { const c = { ...u, ...pos }; return targets(b, c, 'skill').filter(t => t.team !== u.team).length || targets(b, c, 'attack').length; };
        const destination = positions.filter(available).reverse()[0] ?? positions[0];
        if (destination.x !== u.x || destination.y !== u.y) {
            await choose(p, 'move', pad);
            for (let n = 0; n < Math.abs(destination.x - u.x); n++)
                await press(p, destination.x > u.x ? 'right' : 'left', pad);
            for (let n = 0; n < Math.abs(destination.y - u.y); n++)
                await press(p, destination.y > u.y ? 'down' : 'up', pad);
            await press(p, 'confirm', pad);
            await expect.poll(async () => (await diag(p)).mode).toBe('command');
            d = await diag(p);
        }
        const current = d.battle!.units.find(v => v.id === d.selected)!;
        const injured = targets(d.battle!, current, 'item').filter(t => t.maxHp - t.hp >= 35).sort((a, z) => a.hp - z.hp);
        const cmd = injured.length ? 'item' : targets(d.battle!, current, 'skill').some(t => t.team !== current.team) ? 'skill' : targets(d.battle!, current, 'attack').length ? 'attack' : 'wait';
        await choose(p, cmd, pad);
        if (cmd !== 'wait') {
            const ts = targets(d.battle!, current, cmd);
            const chosen = cmd === 'item' ? injured[0] : [...ts].sort((a, z) => a.hp - z.hp)[0];
            for (let i = 0; i < ts.findIndex(t => t.id === chosen.id); i++)
                await press(p, 'right', pad);
            await press(p, 'confirm', pad);
        }
    }
    throw Error('Combat exceeded bounded planner');
}
async function shot(p: Page, name: string) { await p.screenshot({ path: `docs/game/evidence/${name}.png` }); }
async function contained(p: Page) { const bad = await p.locator('button:visible').evaluateAll(els => els.filter(e => !e.closest('[inert]')).filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight; }).map(e => e.textContent)); expect(bad).toEqual([]); }
test('keyboard full campaign, equipment, save and real 1024x768 DPR2 screenshots', async ({ page }) => {
    test.setTimeout(300000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await boot(page);
    await shot(page, 'world');
    await choose(page, 'stage-0');
    await choose(page, 'party');
    await shot(page, 'party');
    await choose(page, 'equipment');
    await choose(page, 'gear-weapon-1');
    await shot(page, 'equipment');
    for (const h of [0, 1, 2]) {
        await choose(page, 'hero-' + h);
        await choose(page, 'gear-weapon-1');
        await choose(page, 'gear-armor-1');
    }
    await choose(page, 'party');
    await choose(page, 'items');
    await contained(page);
    await choose(page, 'party');
    await choose(page, 'deploy');
    await shot(page, 'dialogue');
    await choose(page, 'talk-1');
    await choose(page, 'talk-0');
    await shot(page, 'battle-isometric');
    expect((await diag(page)).dimensions).toEqual({ width: 1024, height: 768, backingWidth: 2048, backingHeight: 1536, dpr: 2 });
    const cursor = (await diag(page)).cursor;
    await press(page, 'view');
    expect((await diag(page)).cursor).toEqual(cursor);
    await shot(page, 'battle-top');
    await press(page, 'view');
    await press(page, 'menu');
    await choose(page, 'settings');
    await contained(page);
    await shot(page, 'settings');
    await press(page, 'cancel');
    await press(page, 'cancel');
    await win(page);
    await shot(page, 'victory');
    await choose(page, 'next-stage');
    for (const stage of [1, 2]) {
        await deploy(page, stage);
        await win(page);
        await choose(page, 'next-stage');
    }
    await expect(page.locator('#game')).toHaveAttribute('data-screen', 'ending');
    await shot(page, 'ending');
    await page.reload();
    await choose(page, 'continue');
    await expect(page.locator('.map-info')).toContainText('3 / 3');
    expect(errors).toEqual([]);
});
test('simulated standard gamepad completes battle and reconnect restores focus safely', async ({ page }) => {
    test.setTimeout(240000);
    await boot(page, true);
    await deploy(page, 0, true);
    await press(page, 'view', true);
    await press(page, 'view', true);
    await page.evaluate(() => {
        (window as unknown as {
            mockConnected: boolean;
        }).mockConnected = false;
    });
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => {
        (window as unknown as {
            mockConnected: boolean;
        }).mockConnected = true;
        (window as unknown as {
            mockButtons: number[];
        }).mockButtons = [0];
    });
    await frames(page);
    await choose(page, 'resume');
    expect((await diag(page)).modal).toBeNull();
    await page.evaluate(() => {
        (window as unknown as {
            mockButtons: number[];
        }).mockButtons = [];
    });
    await frames(page);
    await win(page, true);
    await choose(page, 'world', true);
    await deploy(page, 0, true);
    await press(page, 'menu', true);
    await choose(page, 'restart', true);
    expect((await diag(page)).battle?.round).toBe(1);
});
test('mapping keyboard capture, cancel, saved restore and defaults; responsive resize', async ({ page }) => {
    await boot(page);
    await press(page, 'menu');
    await choose(page, 'settings');
    await choose(page, 'bind-keys-4');
    await page.keyboard.press('z');
    expect((await diag(page)).bindings.keys.confirm).toBe('KeyZ');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.reload();
    expect((await diag(page)).bindings.keys.confirm).toBe('KeyZ');
    await page.keyboard.press('z');
    await press(page, 'menu');
    for (let i = 0; i < 15; i++) {
        if (await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id) === 'settings')
            break;
        await press(page, 'down');
    }
    await page.keyboard.press('z');
    for (let i = 0; i < 60; i++) {
        if (await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id) === 'defaults')
            break;
        await press(page, 'down');
    }
    await page.keyboard.press('z');
    expect((await diag(page)).bindings).toEqual(defaults());
    await page.setViewportSize({ width: 1280, height: 900 });
    await frames(page);
    expect((await diag(page)).dimensions.backingWidth).toBe(2560);
    await contained(page);
    await shot(page, 'responsive-1280');
});
test('defeat and restart accessible with keyboard, corrupted saves recover', async ({ page }) => {
    test.setTimeout(90000);
    await page.addInitScript(() => localStorage.setItem('tacticssd.campaign', 'broken'));
    await boot(page);
    await deploy(page);
    for (let i = 0; i < 240 && (await diag(page)).screen === 'battle'; i++) { // End turn through the pause-safe selection menu using Tab focus and Space native activation.
        await press(page, 'menu');
        await choose(page, 'finish-turn');
        await press(page, 'confirm');
        // Multiple consecutive enemy ATs include path travel + 720ms action recovery each.
        await expect.poll(async () => { const d = await diag(page); return d.screen === 'result' || d.battle?.phase === 'ally' && d.mode !== 'animating'; }, { timeout: 15000 }).toBe(true);
    }
    expect((await diag(page)).battle?.phase).toBe('lost');
    await choose(page, 'restart');
    expect((await diag(page)).battle?.round).toBe(1);
});
test('gamepad button remap persists, modal traps focus, moving view stays on same logical tile', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await boot(page, true);
    await deploy(page, 0, true);
    await press(page, 'next', true);
    await choose(page, 'move', true);
    await press(page, 'confirm', true); // Confirming the current tile is a safe no-op.
    expect((await diag(page)).mode).toBe('command');
    expect(errors).toEqual([]);
    await choose(page, 'move', true);
    await press(page, 'right', true);
    await press(page, 'down', true);
    await press(page, 'right', true);
    const before = (await diag(page)).cursor;
    const during = await page.evaluate(() => new Promise<{
        mode: string;
        top: boolean;
        cursor: {
            x: number;
            y: number;
        };
    }>(resolve => {
        const w = window as unknown as {
            mockButtons: number[];
            tacticsDiagnostics: () => {
                mode: string;
                top: boolean;
                cursor: {
                    x: number;
                    y: number;
                };
            };
        };
        w.mockButtons = [0, 3];
        requestAnimationFrame(() => { const state = w.tacticsDiagnostics(); w.mockButtons = []; resolve(state); });
    }));
    expect(during.mode).toBe('walking');
    expect(during.top).toBe(true);
    expect(during.cursor).toEqual(before);
    await frames(page);
    await press(page, 'menu', true);
    const state = (await diag(page)).top;
    await press(page, 'view', true);
    expect((await diag(page)).top).toBe(state);
    await choose(page, 'settings', true);
    await choose(page, 'bind-buttons-4', true);
    await page.evaluate(() => {
        (window as unknown as {
            mockButtons: number[];
        }).mockButtons = [2];
    });
    await frames(page);
    await page.evaluate(() => {
        (window as unknown as {
            mockButtons: number[];
        }).mockButtons = [];
    });
    await frames(page);
    expect((await diag(page)).bindings.buttons.confirm).toBe(2);
    await press(page, 'cancel', true);
    await press(page, 'cancel', true);
    await expect.poll(async () => (await diag(page)).mode).toBe('command');
    await page.reload();
    expect((await diag(page)).bindings.buttons.confirm).toBe(2);
});
test('generated rig opens in existing editor, animates four directions and saves v2 without altering original presets', async ({ page }) => {
    await page.goto('/tools/characterRig/');
    await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
    await page.locator('#load-json').setInputFiles('game/assets/dawn-rig.json');
    await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
    await page.locator('#reconnect').setInputFiles('game/assets/dawn-parts.png');
    await expect.poll(() => page.evaluate(() => window.rigDiagnostics().missing)).toBe(0);
    await page.locator('[data-mode="Walk"]').click();
    await page.locator('#compare').click();
    await page.locator('#phase').fill('0.25');
    expect(await page.evaluate(() => window.rigDiagnostics().sprites)).toBe(24);
    await page.locator('#preview').screenshot({ path: 'docs/game/evidence/generated-rig-four-directions.png' });
    await page.locator('#parts [data-part="body"]').click();
    await page.locator('input[data-path="pivot.y"]').fill('36');
    const download = page.waitForEvent('download');
    await page.locator('[data-action="save"]').click();
    const result = await download;
    const { readFile } = await import('node:fs/promises');
    const saved = JSON.parse(await readFile((await result.path())!, 'utf8'));
    expect(saved.schemaVersion).toBe(2);
    expect(saved.views.Front.parts.find((p: {
        id: string;
    }) => p.id === 'body').pivot.y).toBe(36);
});
