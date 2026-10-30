import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.spec.js',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:8787' },
  webServer: {
    command: 'npx wrangler dev --port 8787',
    url: 'http://localhost:8787',
    reuseExistingServer: true,
    timeout: 120000
  }
});
