// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  // workers=1 é OBRIGATÓRIO: execução paralela sobrecarrega o ThreadingHTTPServer
  // e polui o estado entre specs (flaky). Ver skill investidor10-dashboard.
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:8765',
    headless: true,
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 900 } } },
  ],
  reporter: [['html', { outputFolder: 'test-results' }], ['list']],
});