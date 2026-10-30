import { defineConfig } from '@playwright/test';

// All e2e specs share one local D1, so they run one at a time.
// Needs .dev.vars (copy .dev.vars.example).
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.spec.js',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: { baseURL: 'http://localhost:8787' },
  webServer: [
    {
      command: 'node tests/e2e/mock-sheets.mjs',
      url: 'http://localhost:8790/records',
      reuseExistingServer: true
    },
    {
      command: 'npx wrangler d1 migrations apply eve-survey --local && npx wrangler dev --port 8787 --var RATE_LIMIT_OFF:1',
      url: 'http://localhost:8787',
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
});
