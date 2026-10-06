import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { TOOLS } from './tools/registry.ts';

export default defineConfig({
  appType: 'mpa',
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
