// Config for `npm run test:visual`: screenshots of every page, compared with the ones taken
// earlier with --update-snapshots (see the README). Not part of `npm run test:e2e` or CI:
// screenshots differ per machine, so they stay on the machine that took them.
import { defineConfig, devices } from '@playwright/test';
import base, { localServer } from './playwright.config';

export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: 'visual.spec.ts',
  // One test goes through every page.
  timeout: 180_000,
  // The HTML report shows each difference side by side: npx playwright show-report.
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  // Always build and serve this checkout: a server still running would show another version.
  webServer: base.webServer && { ...localServer, reuseExistingServer: false },
});
