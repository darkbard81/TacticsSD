import { defineConfig } from '@playwright/test';
const port = Number(process.env.TACTICSSD_TEST_PORT ?? 4186);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: '.', testMatch: '**/tests/browser/**/*.spec.ts', fullyParallel: false, workers: 1,
  use: { baseURL, viewport: { width: 1440, height: 1100 }, trace: 'retain-on-failure', launchOptions: { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: `npm run tool -- --host 127.0.0.1 --port ${port} --strictPort`, url: baseURL, reuseExistingServer: false },
});
