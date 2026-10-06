import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });

test('all eight class sheets have unique poses, transparent gutters and painted hand sockets', async ({ page }) => {
    await page.goto('/game/');
    const result = await page.evaluate(async () => {
        const path = '/game/elf-sprites.ts'; const { ElfSprites, ELF_STATES, elfSocket, elfPose } = await import(path);
        const atlasPath = '/game/assets/elf-sd-sheet-v2/frames.json'; const atlas = (await import(atlasPath)).default;
        const sprites = new ElfSprites(); await sprites.ready;
        const bad: string[] = [], hashes = new Set<number>();
        const signatures = new Set<string>();
        for (const hero of [0,1,2,3,6,7,8,9]) {
        hashes.clear();
        const sheet = sprites.sheetFor(hero), c = document.createElement('canvas'); c.width = 1792; c.height = 1024;
        const ctx = c.getContext('2d')!; ctx.drawImage(sheet, 0, 0);
        for (const direction of ['SE', 'NE']) for (const state of ELF_STATES) for (let frame = 0; frame < atlas.sequences.front[state].length; frame++) {
            const pose = { state, frame }, f = elfPose(direction, pose);
            const data = ctx.getImageData(f.rect.x, f.rect.y, 256, 256).data;
            let hash = 0;
            for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
                const alpha = data[(y * 256 + x) * 4 + 3];
                hash = (hash + alpha * (x + y * 256 + 1)) % 2147483647;
                if ((x < 8 || x >= 248 || y < 8 || y >= 248) && alpha > 32) bad.push(`${f.id}: clipping`);
            }
            hashes.add(hash);
            const { hand } = elfSocket(direction, pose, hero), [x, y] = hand.map(Math.round);
            if (data[(y * 256 + x) * 4 + 3] < 100) bad.push(`${f.id}: empty hand socket ${hand}`);
        }
        if (hashes.size !== 26) bad.push(`unique frames: ${hashes.size}`);
        for (const y of [512, 768]) if (ctx.getImageData(1536, y, 256, 256).data.some((v, i) => i % 4 === 3 && v)) bad.push('blank cell has pixels');
        signatures.add(c.toDataURL());
        }
        return { loaded: sprites.loaded, bad, dpr: devicePixelRatio, classes: signatures.size };
    });
    expect(result).toEqual({ loaded: true, bad: [], dpr: 2, classes: 8 });
});

test('actual canvas equipment and all four directions mirror together in both view scales', async ({ page }) => {
    await page.goto('/game/');
    const result = await page.evaluate(async () => {
        const path = '/game/elf-sprites.ts'; const { ElfSprites } = await import(path); const sprites = new ElfSprites(); await sprites.ready;
        const failures: string[] = [], hashes: number[] = [];
        const draw = (hero: number, variant: number, dir: string, size: number, motion: string, progress: number) => {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
            const c = canvas.getContext('2d')!; c.translate(256, 420); sprites.draw(c, hero, variant, dir, 0, size, false, progress, motion);
            return c.getImageData(0, 0, 512, 512).data;
        };
        for (const size of [54, 84]) for (const [hero, variant, motion] of [[0, 0, 'slash'], [0, 1, 'thrust'], [1, 0, 'shoot'], [1, 2, 'shoot'], [1, 3, 'shoot'], [1, 4, 'shoot'], [2, 1, 'cast'], [3, 1, 'heal'], [6, 1, 'slash'], [7, 0, 'cast'], [8, 1, 'slash'], [9, 0, 'slash']] as const) {
            for (const [a, b] of [['SE', 'SW'], ['NE', 'NW']]) for (const phase of [.1, .35, .6, .85]) {
                const left = draw(hero, variant, a, size, motion, phase), right = draw(hero, variant, b, size, motion, phase);
                let difference = 0, alpha = 0, hash = 0;
                for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
                    const i = (y * 512 + x) * 4, j = (y * 512 + 511 - x) * 4;
                    difference += Math.abs(left[i + 3] - right[j + 3]); alpha += left[i + 3]; hash = (hash + left[i + 3] * (x + y * 512 + 1)) % 2147483647;
                }
                if (alpha < 10000 || difference / alpha > .08) failures.push(`${size}/${hero}/${variant}/${a}/${phase}: ${difference / alpha}`);
                hashes.push(hash);
            }
        }
        return { failures, unique: new Set(hashes).size, samples: hashes.length };
    });
    expect(result.failures).toEqual([]); expect(result.samples).toBe(192); expect(result.unique).toBeGreaterThan(150);
});

test('walking follows each path segment and pausing or switching view does not advance the body clock', async ({ page }) => {
    await page.goto('/game/');
    const result = await page.evaluate(async () => {
        const renderPath = '/game/render.ts', domainPath = '/game/domain.ts';
        const { Renderer } = await import(renderPath), { makeBattle, newCampaign } = await import(domainPath);
        const host = document.createElement('div'); const r = new Renderer(host); await r.elf.ready;
        const b = makeBattle(0, newCampaign()), u = b.units[0];
        const s = { command: 'attack', battle: b, cursor: { x: 1, y: 2 }, selected: u.id, mode: 'walking', top: false, zoom: 1, pan: { x: 0, y: 0 }, paused: false };
        r.draw(s, 0); r.move(u.id, [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }]); r.draw(s, 80);
        const first = r.visualPosition(u, b), before = r.animationTime, pixels = r.canvas.toDataURL();
        r.draw({ ...s, paused: true }, 160); const frozen = r.canvas.toDataURL() === pixels;
        r.draw({ ...s, top: true, paused: true }, 240); const switchedClock = r.animationTime;
        r.draw({ ...s, top: true }, 400); const next = r.visualPosition(u, b);
        return { first, next, before, switchedClock, frozen, dimensions: r.dimensions };
    });
    expect(result.first.facing).toBe('SE'); expect(result.next.facing).toBe('NE');
    expect(result.frozen).toBe(true); expect(result.switchedClock).toBe(result.before);
    expect(result.dimensions).toMatchObject({ width: 1024, height: 768, backingWidth: 2048, backingHeight: 1536, dpr: 2 });
});

test('renderer routes items to jump poses and restores the atlas after a custom rig', async ({ page }) => {
    await page.goto('/game/');
    const result = await page.evaluate(async () => {
        const renderPath = '/game/render.ts', domainPath = '/game/domain.ts', rigPath = '/game/assets/dawn-rig.json';
        const { Renderer } = await import(renderPath), { makeBattle, newCampaign } = await import(domainPath);
        const rig = (await import(rigPath)).default;
        const r = new Renderer(document.createElement('div')); await r.elf.ready;
        const u = makeBattle(0, newCampaign()).units[0]; u.facing = 'SE';
        const c = r.canvas.getContext('2d'), original = c.drawImage.bind(c);
        let cells: number[][] = [];
        c.drawImage = (image: CanvasImageSource, ...args: number[]) => {
            if ('width' in image && image.width === 1792) cells.push(args.slice(0, 2));
            original(image, ...args);
        };
        const draw = (kind: string, phase: number) => {
            cells = []; r.animationTime = phase * .65; r.attacks.set(u.id, { start: 0, kind });
            r.actor(u, { x: 150, y: 250 }, false, false, false); return cells[0] ?? null;
        };
        const item = [draw('item', .3), draw('item', .6)], attack = draw('attack', .3);
        await r.setRig(rig, '/game/assets/dawn-parts.png'); const custom = draw('attack', .3);
        await r.restoreDefaultRig(); const restored = draw('attack', .3);
        r.elf.loaded = false; const fallback = draw('attack', .3);
        return { item, attack, custom, restored, fallback };
    });
    expect(result).toEqual({ item: [[1536, 0], [1280, 0]], attack: [512, 512], custom: null, restored: [512, 512], fallback: null });
});

test('runtime uses the real browser DPR instead of forcing DPR2', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
    const page = await context.newPage();
    try {
        await page.goto('/game/');
        const read = () => page.evaluate(() => (window as any).tacticsDiagnostics().dimensions);
        await expect.poll(read).toMatchObject({ width: 1280, height: 900, backingWidth: 1920, backingHeight: 1350, dpr: 1.5 });
        await page.setViewportSize({ width: 1024, height: 768 });
        await expect.poll(read).toMatchObject({ width: 1024, height: 768, backingWidth: 1536, backingHeight: 1152, dpr: 1.5 });
    } finally { await context.close(); }
});


test('idle walks in place in both views without moving units, spending RT, or changing gameplay', async ({page})=>{
 await page.goto('/game/');
 const result=await page.evaluate(async()=>{
  const rp='/game/render.ts',dp='/game/domain.ts';
  const {Renderer}=await import(rp),{makeBattle,newCampaign}=await import(dp);
  const r=new Renderer(document.createElement('div'));await r.elf.ready;
  const b=makeBattle(0,newCampaign()),snapshot=JSON.stringify(b),u=b.units[0];
  const s={command:'attack',battle:b,cursor:{x:1,y:2},selected:null,mode:'unit',top:false,zoom:1,pan:{x:0,y:0},paused:false};
  const changed=[];
  for(const top of [false,true]){
   r.draw({...s,top},top?1000:0);const before=r.canvas.toDataURL(),position=r.visualPosition(u,b);
   r.draw({...s,top},top?1210:210);
   changed.push(before!==r.canvas.toDataURL());
   if(JSON.stringify(position)!==JSON.stringify(r.visualPosition(u,b)))throw Error('Idle position drift');
  }
  return {changed,unchanged:JSON.stringify(b)===snapshot,routeCount:r.routes.size};
 });
 expect(result).toEqual({changed:[true,true],unchanged:true,routeCount:0});
});
