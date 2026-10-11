import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const characters = [
  { id: 'elf-cleric', folder: 'elf-cleric-woman', prefix: 'Cleric' },
  { id: 'elf-barbarian', folder: 'elf-barbarian-woman', prefix: 'Babarian' },
  { id: 'elf-thief', folder: 'elf-thief-woman', prefix: 'Thief' },
];
const requested = process.argv.slice(2);
if (requested.some(id => !characters.some(character => character.id === id))) {
  throw new Error(`Unknown character. Choose: ${characters.map(character => character.id).join(', ')}`);
}
const selected = requested.length ? characters.filter(character => requested.includes(character.id)) : characters;
const output = new URL('../assets/', import.meta.url);
const poses = ['Base', 'Left', 'Base', 'Right'];
const directions = ['Front', 'Back'];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await mkdir(output, { recursive: true });
  for (const character of selected) {
    const source = new URL(`../../../pixel-art/${character.folder}/`, import.meta.url);
    const inputs = [];
    for (const direction of directions) {
      for (const pose of poses) {
        const name = `${character.prefix}_${direction}_${pose}.png`;
        inputs.push({ name, data: `data:image/png;base64,${(await readFile(new URL(name, source))).toString('base64')}` });
      }
    }
    const result = await page.evaluate(async inputs => {
      const images = await Promise.all(inputs.map(async input => {
        const image = new Image(); image.src = input.data; await image.decode(); return image;
      }));
      // One shared scale and bottom-center anchor preserve relative sizes across poses.
      const width = Math.max(...images.map(image => image.width));
      const height = Math.max(...images.map(image => image.height));
      const scale = Math.min(256 / width, 256 / height);
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D unavailable');
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      images.forEach((image, index) => {
        const w = Math.round(image.width * scale), h = Math.round(image.height * scale);
        context.drawImage(image, (index % 4) * 256 + Math.floor((256 - w) / 2), Math.floor(index / 4) * 256 + 256 - h, w, h);
      });
      return { png: canvas.toDataURL('image/png').split(',')[1], sources: images.map((image, index) => ({ name: inputs[index].name, width: image.width, height: image.height })) };
    }, inputs);
    await writeFile(new URL(`${character.id}-sheet.png`, output), Buffer.from(result.png, 'base64'));
    await writeFile(new URL(`${character.id}-sheet.json`, output), JSON.stringify({ frameWidth: 256, frameHeight: 256, columns: 4, rows: 2, directions, poses, sources: result.sources }, null, 2) + '\n');
    console.log(`Created ${fileURLToPath(new URL(`${character.id}-sheet.png`, output))} (1024×512)`);
  }
} finally { await browser.close(); }
