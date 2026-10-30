import { defineConfig } from '@playwright/test';

// Visual regression for the survey screens. Start a server yourself and pass BASE_URL.
export default defineConfig({
  testDir: 'tests/visual',
  testMatch: '*.visual.spec.js',
  snapshotPathTemplate: 'tests/visual/__baseline__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled' } },
  use: { baseURL: process.env.BASE_URL },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }
  ]
});
