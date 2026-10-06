import {defineConfig} from '/home/deck/Documents/TacticsSD/node_modules/vitest/dist/config.js';
export default defineConfig({root:'/home/deck/Documents/TacticsSD',cacheDir:'/tmp/tacticssd-audit/vitest-cache',test:{include:['tests/**/*.test.ts','tools/*/tests/**/*.test.ts']}});
