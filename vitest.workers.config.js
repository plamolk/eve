import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Tests run inside the Workers runtime with a local D1 and the same bindings as wrangler.jsonc.
export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            TURNSTILE_SECRET: 'test-secret',
            ADMIN_PASSWORD: 'dev-password-change-me-123',
            SESSION_KEY: 'dev-session-key',
            SHEETS_TOKEN: 'dev-sheets-token',
            IMPORT_TOKEN: 'dev-import-token',
            SHEETS_URL: 'https://sheets.test/exec',
            ALLOWED_HOSTS: 'survey.test',
            TURNSTILE_STRICT: '1'
          }
        }
      })
    ],
    test: {
      include: ['tests/worker/**/*.test.js'],
      setupFiles: ['tests/worker/setup.js']
    }
  };
});
