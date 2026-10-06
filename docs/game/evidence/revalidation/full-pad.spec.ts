import { test, expect, type Page } from '/home/deck/Documents/TacticsSD/node_modules/@playwright/test/index.mjs';
import { reachable, targets, distance, type Battle } from '/home/deck/Documents/TacticsSD/game/domain';
import { defaults, type Action, type Bindings } from '/home/deck/Documents/TacticsSD/game/input';
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
async function press(p: Page, a: Action, pad = true) {
    if (pad) {
        const n = defaults().buttons[a];
        if (n < 0)
            throw Error('No digital binding ' + a);
        await p.evaluate(n => {
            (window as unknown as {
                mockButtons: number[];
            }).mockButtons = [n];
        }, n);
        await frames(p);
        await p.evaluate(() => {
            (window as unknown as {
                mockButtons: number[];
            }).mockButtons = [];
        });
        await frames(p);
    }
    else
        await p.keyboard.press(defaults().keys[a].replace('Key', ''));
}
async function choose(p: Page, id: string, pad = true) {
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
async function boot(p: Page, pad = true) {
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
async function deploy(p: Page, stage = 0, pad = true) { await choose(p, 'stage-' + stage, pad); await choose(p, 'party', pad); await choose(p, 'deploy', pad); await choose(p, 'talk-0', pad); await choose(p, 'talk-0', pad); await expect(p.locator('#game')).toHaveAttribute('data-screen', 'battle'); }
async function win(p: Page, pad = true) {
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
test('INDEPENDENT mockpad full campaign, equipment, save and real 1024x768 DPR2 screenshots', async ({ page }) => {
    test.setTimeout(420000);
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
