import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { defineConfig } from 'vitest/config';
import { TOOLS } from './tools/registry.ts';

export default defineConfig({
  appType: 'mpa',
  plugins: [{
    name: 'manual-battle-capture',
    configureServer(server) {
      server.middlewares.use('/__tactics_capture', (req, res) => {
        const name = req.url?.slice(1);
        if (req.method !== 'POST' || !name || !/^((terrain-[0-2]-)?(battle-(iso|top)|classes-(front|back)|terrain-detail|water-detail)\.(png|json))$/.test(name) || req.headers.origin !== `http://${req.headers.host}`) { res.statusCode = 403; res.end(); return; }
        const chunks: Buffer[] = []; let size = 0;
        req.on('data', (data: Buffer) => { size += data.length; if (size > 32 * 1024 * 1024) req.destroy(); else chunks.push(data); });
        req.on('end', () => { void (async () => {
          const folder = resolve(import.meta.dirname, name.startsWith('terrain-') ? 'docs/game/evidence/terrain-painted' : 'docs/game/evidence/three-v2'); await mkdir(folder, { recursive: true });
          await writeFile(resolve(folder, name), Buffer.concat(chunks)); res.end('saved');
        })().catch(() => { res.statusCode = 500; res.end('capture failed'); }); });
      });
    },
  }],
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        game: resolve(import.meta.dirname, 'game/index.html'),
        ...Object.fromEntries(TOOLS.map(tool => [tool.id, resolve(import.meta.dirname, tool.path, 'index.html')])),
      },
    },
  },
  test: { include: ['tests/**/*.test.ts', 'tools/*/tests/**/*.test.ts'] },
});
