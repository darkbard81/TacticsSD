import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const evidence = 'docs/game/evidence/character-sprites';

test('eight sprite atlases contain front/back walk and downed with isolated cells', async ({ page }) => {
  await page.goto('/tools/spriteSheet/');
  const result = await page.evaluate(async () => {
    const path = '/game/sprite-actors.ts';
    const { ClassSpriteSheets, SPRITE_CLASS_IDS } = await import(/* @vite-ignore */ path);
    const sheets = new ClassSpriteSheets(); await sheets.ready;
    const failures: string[] = [], signatures = new Set<string>();
    for (const id of SPRITE_CLASS_IDS) {
      const bundle = sheets.entries.get(id); if (!bundle) { failures.push(`${id}: missing`); continue; }
      const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
      const ctx = c.getContext('2d')!; ctx.drawImage(bundle.image, 0, 0);
      signatures.add(c.toDataURL());
      for (let row = 0; row < 2; row++) {
        const hashes: number[] = [];
        for (let col = 0; col < 8; col++) {
          const bytes = ctx.getImageData(col * 256, row * 256, 256, 256).data;
          let hash = 0, painted = 0;
          for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const alpha = bytes[(y * 256 + x) * 4 + 3];
            hash = (hash + alpha * (x + y * 256 + 1)) % 2147483647; painted += alpha;
            if ((x < 4 || x >= 252 || y < 4 || y >= 252) && alpha > 0) failures.push(`${id}/${row}/${col}: cell edge`);
          }
          if (painted < 10000) failures.push(`${id}/${row}/${col}: empty`);
          hashes.push(hash);
        }
        if (hashes[0] !== hashes[2] || new Set(hashes.slice(0, 4)).size !== 3) failures.push(`${id}/${row}: walk cycle`);
        if (hashes[7] === hashes[0]) failures.push(`${id}/${row}: downed repeats base`);
      }
      for (const [key, socket] of Object.entries(bundle.atlas.sockets) as [string, {x: number; y: number}][]) {
        const [view, col] = key.split(':');
        const alpha = ctx.getImageData(Number(col) * 256 + Math.round(socket.x), (view === 'front' ? 0 : 256) + Math.round(socket.y), 1, 1).data[3];
        if (alpha < 100) failures.push(`${id}/${key}: empty weapon grip`);
      }
    }
    return { failures, classes: sheets.entries.size, uniqueSheets: signatures.size };
  });
  expect(result).toEqual({ failures: [], classes: 8, uniqueSheets: 8 });
});

test('real Three actors animate idle, walk and downed without changing battle rules', async ({ page }) => {
  await page.goto('/tools/spriteSheet/');
  const result = await page.evaluate(async () => {
    const rp = '/game/render.ts', dp = '/game/domain.ts';
    const { Renderer } = await import(/* @vite-ignore */ rp), { makeBattle, newCampaign } = await import(/* @vite-ignore */ dp);
    const r: any = new Renderer(document.createElement('div'));
    await Promise.all([r.classes.ready, r.sheets.ready, r.painted.ready]);
    const b = makeBattle(0, newCampaign()), original = b.units[0];
    const heroes = [0, 1, 2, 3, 6, 7, 8, 9];
    const positions = b.tiles.filter((tile: any) => !tile.block && tile.kind !== 'water').slice(8, 16);
    b.units = heroes.map((hero, i) => ({ ...original, id: `sprite-${hero}`, hero, name: `Class ${hero}`, x: positions[i].x, y: positions[i].y }));
    const snapshot = JSON.stringify(b), s = { command: 'attack', battle: b, cursor: positions[0], selected: null, mode: 'unit', top: false, zoom: 1, pan: { x: 0, y: 0 }, paused: false };
    r.draw(s, 1000); const idle0 = r.canvas.toDataURL(); r.draw(s, 1250); const idle1 = r.canvas.toDataURL();
    const idle = r.diagnostics().actors;
    r.draw({ ...s, paused: true }, 1500); const frozen = r.canvas.toDataURL() === idle1;
    const orientations = [];
    for (const top of [false, true]) for (const facing of ['SE', 'SW', 'NE', 'NW']) {
      b.units.forEach((u: any) => { u.facing = facing; }); r.draw({ ...s, top, paused: true }, 1600);
      orientations.push({ top, facing, sprite: r.diagnostics().actors[0].sprite });
    }
    b.units.forEach((u: any) => { u.facing = 'SW'; });
    const u = b.units[0]; r.move(u.id, [{ x: u.x, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x + 1, y: u.y - 1 }]);
    r.draw(s, 1680); const walk = r.diagnostics().actors.find((a: any) => a.id === u.id).sprite;
    r.draw(s, 1720); const walkPNG = r.canvas.toDataURL();
    r.routes.clear(); r.draw(s, 1800); const idlePNG = r.canvas.toDataURL();
    r.draw({ ...s, top: true, paused: true }, 1800); const topPNG = r.canvas.toDataURL();
    // KO must select Downed on the very first draw, even at collapse progress 0.
    b.units.forEach((unit: any) => { unit.hp = 0; }); r.draw(s, 1900);
    const downed = r.diagnostics().actors.map((a: any) => a.sprite), downedPNG = r.canvas.toDataURL();
    const visibleAtKO = [...r.actors.values()].every((a: any) => a.root.visible);
    r.draw(s, 2600); const hiddenAfterCollapse = [...r.actors.values()].every((a: any) => !a.root.visible);
    // Restore a clean fixture for the rules-isolation check.
    b.units.forEach((unit: any) => { unit.hp = original.hp; unit.facing = original.facing; });
    return { idleChanged: idle0 !== idle1, idle, frozen, walk, downed, visibleAtKO, hiddenAfterCollapse, orientations,
      unchanged: JSON.stringify(b) === snapshot, captures: { idle: idlePNG, walk: walkPNG, downed: downedPNG, top: topPNG } };
  });
  expect(result.idleChanged).toBe(true); expect(result.frozen).toBe(true); expect(result.unchanged).toBe(true);
  expect(result.idle).toHaveLength(8); expect(result.idle.every((a: any) => a.sprite?.state === 'idle' && !a.parts)).toBe(true);
  expect(result.walk.state).toBe('walk'); expect(result.downed.every((a: any) => a.state === 'downed' && a.frame === 7)).toBe(true);
  expect(result.visibleAtKO).toBe(true); expect(result.hiddenAfterCollapse).toBe(true);
  for (const top of [false, true]) expect(new Set(result.orientations.filter((o: any) => o.top === top).map((o: any) => `${o.sprite.view}/${o.sprite.flip}`)).size).toBe(4);
  await mkdir(evidence, { recursive: true });
  for (const [name, png] of Object.entries(result.captures)) await writeFile(`${evidence}/${name}.png`, Buffer.from(png.split(',')[1], 'base64'));
  await writeFile(`${evidence}/runtime.json`, JSON.stringify({ ...result, captures: undefined }, null, 2) + '\n');
});

test('actors share textures while retaining independent UVs and clocks', async ({ page }) => {
  await page.goto('/tools/spriteSheet/');
  const result = await page.evaluate(async () => {
    const path = '/game/sprite-actors.ts'; const { ClassSpriteSheets, SpriteActor } = await import(/* @vite-ignore */ path);
    const sheets = new ClassSpriteSheets(); await sheets.ready;
    const bundle = sheets.entries.get('warrior'), a = new SpriteActor(bundle), b = new SpriteActor(bundle);
    const uv = () => [...b.mesh.geometry.getAttribute('uv').array]; const before = uv();
    a.pose(0, 'walk', 1, 'front', false); a.pose(.15, 'walk', 1, 'back', true);
    b.pose(0, 'idle', 1, 'front', false);
    const result = { shared: a.mesh.material.map === b.mesh.material.map, independentUV: JSON.stringify(before) === JSON.stringify(uv()),
      a: a.root.userData.animation, b: b.root.userData.animation, offset: bundle.texture.offset.toArray(), repeat: bundle.texture.repeat.toArray() };
    a.clear(); b.clear(); return result;
  });
  expect(result.shared).toBe(true); expect(result.independentUV).toBe(true);
  expect(result.a).toMatchObject({ state: 'walk', frame: 1, view: 'back', flip: true });
  expect(result.b).toMatchObject({ state: 'idle', frame: 0, clock: 0 });
  expect(result.offset).toEqual([0, 0]); expect(result.repeat).toEqual([1, 1]);
});

test('game UI opens a battle with sprite actors and toggles the tactical view', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game/');
  await page.locator('[data-id="new"]').click();
  await page.locator('[data-id="stage-0"]').click();
  await page.locator('[data-id="party"]').click();
  await page.locator('[data-id="deploy"]').click();
  await page.locator('[data-id="talk-0"]').click();
  await page.locator('[data-id="talk-0"]').click();
  const read = () => page.evaluate(() => (window as any).tacticsDiagnostics());
  await expect.poll(async () => (await read()).screen).toBe('battle');
  await expect.poll(async () => (await read()).rendering.spriteClasses.length).toBe(8);
  await expect.poll(async () => (await read()).rendering.actors.every((a: any) => a.sprite && !a.parts)).toBe(true);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/game-iso.png` });
  await page.locator('[data-id="view"]').click();
  await expect.poll(async () => (await read()).top).toBe(true);
  await page.screenshot({ path: `${evidence}/game-top.png` });
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await read()).modal).toBe('pause');
  expect(errors).toEqual([]);
});
