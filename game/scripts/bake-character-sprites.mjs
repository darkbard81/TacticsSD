// Preserve the shipped character art and bone motion as immutable 2D frames.
// This is an offline bake, not a substitute for imagegen-authored prone artwork.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const ids = ['warrior', 'archer', 'wizard', 'cleric', 'spellblade', 'knight', 'terror-knight'];
const requested = process.argv.slice(2);
if (requested.some(id => !ids.includes(id))) throw Error(`Choose: ${ids.join(', ')}`);
const selected = requested.length ? requested : ids;
// Existing sheets, including the separately authored Berserker, are preserved.
for (const id of selected) {
  try { await access(resolve(root, `game/assets/character-sprites/${id}/sheet.png`)); }
  catch { continue; }
  if (process.env.TACTICSSD_REBAKE !== '1') throw Error(`${id}: output exists; set TACTICSSD_REBAKE=1 to explicitly replace a baked sheet.`);
}
const browser = await chromium.launch({ headless: true, env: { ...process.env, DISPLAY: '' }, args: ['--no-sandbox', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TACTICSSD_BAKE_URL ?? 'http://127.0.0.1:4187/tools/spriteSheet/');
  for (const id of selected) {
    const result = await page.evaluate(async id => {
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const { loadStandee } = await import('/game/class-standees.ts');
      const data = await (await fetch(`/game/assets/class-parts/${id}/rig.json`)).json();
      const bundle = await loadStandee(data, () => `/game/assets/class-parts/${id}/parts.png`);
      const gpu = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      gpu.setSize(1024, 1024); gpu.setPixelRatio(1); gpu.setClearColor(0, 0); gpu.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-512, 512, 920, -104, .1, 20000);
      camera.position.set(0, 0, 10000); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      const directions = ['Front', 'Back'], poses = ['Base', 'Left', 'Base', 'Right', 'Attack01', 'Attack02', 'Hit', 'Downed'];
      // The game uses Front bone transforms and exposes the rear caps by turning
      // the complete standee. Preserve that exact convention in both rows.
      const rigs = directions.map(() => bundle.template.fork());
      const pose = (rig, name) => {
        const seconds = name === 'Left' ? .25 * data.motion.duration : name === 'Right' ? .75 * data.motion.duration : 0;
        rig.pose(seconds, name === 'Left' || name === 'Right' ? 'Walk' : 'Rest', parts => {
          for (const part of parts) {
            // Match the runtime's authored right-arm attack and body hit offset.
            if (part.id === 'armR' && name.startsWith('Attack')) part.rotation -= name === 'Attack01' ? 1.65 : .65;
            if (part.id === 'body' && name === 'Hit') part.rotation += .07;
          }
        });
        rig.root.updateMatrixWorld(true);
      };
      let maxWidth = 0, maxTop = 0, maxBottom = 0;
      for (const rig of rigs) for (const name of poses.filter(name => name !== 'Downed')) {
        pose(rig, name); const box = new THREE.Box3().setFromObject(rig.root);
        maxWidth = Math.max(maxWidth, Math.abs(box.min.x) * 2, Math.abs(box.max.x) * 2);
        maxTop = Math.max(maxTop, box.max.y); maxBottom = Math.max(maxBottom, -box.min.y);
      }
      const scale = Math.min(224 / maxWidth, 218 / maxTop, maxBottom ? 18 / maxBottom : Infinity);
      const sheet = document.createElement('canvas'); sheet.width = 2048; sheet.height = 512;
      const ctx = sheet.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      const frames = [], sockets = {};
      for (let row = 0; row < 2; row++) {
        const rig = rigs[row]; scene.add(rig.root);
        for (let col = 0; col < poses.length; col++) {
          const name = poses[col]; rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, row ? Math.PI : 0, 0); rig.root.scale.setScalar(1);
          pose(rig, name); let frameScale = scale;
          if (name === 'Downed') {
            // Keep the old bone renderer's sideways collapse, explicitly marked as legacy.
            rig.root.rotation.z = Math.PI / 2; rig.root.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(rig.root), size = box.getSize(new THREE.Vector3());
            frameScale = Math.min(scale, 224 / size.x, 96 / size.y);
            rig.root.scale.setScalar(frameScale * 4);
            rig.root.position.set(-(box.min.x + box.max.x) / 2 * frameScale * 4, -box.min.y * frameScale * 4, 0);
          } else rig.root.scale.setScalar(scale * 4);
          rig.root.updateMatrixWorld(true); gpu.render(scene, camera);
          ctx.drawImage(gpu.domElement, col * 256, row * 256, 256, 256);
          if (name.startsWith('Attack')) {
            const arm = rig.part('armR'), hand = rig.bone('armR').localToWorld(new THREE.Vector3(arm.rect.width * .5 - arm.pivot.x, -(arm.rect.height * .86 - arm.pivot.y), 5));
            sockets[`${directions[row].toLowerCase()}:${col}`] = { x: 128 + hand.x / 4, y: 230 - hand.y / 4, angle: .28, behind: false };
          }
          frames.push({ direction: directions[row], pose: name, png: gpu.domElement.toDataURL('image/png').split(',')[1], scale: frameScale });
        }
        scene.remove(rig.root); rig.clear();
      }
      gpu.dispose(); bundle.template.clear();
      return { png: sheet.toDataURL('image/png').split(',')[1], frames, atlas: {
        frameWidth: 256, frameHeight: 256, columns: 8, rows: 2, anchor: { x: 128, y: 230 },
        referenceSize: data.views.Front.referenceSize * scale, directions, poses, sockets,
        animationSource: 'existing StandeeRig bone bake', downedStyle: 'legacy sideways collapse; imagegen prone pending',
        sources: frames.map(({ direction, pose, scale }) => ({ direction, pose, scale, rig: `game/assets/class-parts/${id}/rig.json` })),
      } };
    }, id);
    const folder = resolve(root, `game/assets/character-sprites/${id}`);
    const sources = resolve(root, `pixel-art/character-sprites-baked-v1/${id}`);
    await mkdir(folder, { recursive: true }); await mkdir(sources, { recursive: true });
    for (const frame of result.frames) await writeFile(resolve(sources, `${frame.direction}_${frame.pose}.png`), Buffer.from(frame.png, 'base64'));
    await writeFile(resolve(folder, 'sheet.png'), Buffer.from(result.png, 'base64'));
    await writeFile(resolve(folder, 'sheet.json'), JSON.stringify(result.atlas, null, 2) + '\n');
    console.log(`${id}: baked Front/Back Walk, attack, hit, legacy Downed; ${folder}/sheet.png`);
  }
} finally { await browser.close(); }
