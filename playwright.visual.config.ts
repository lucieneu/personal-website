// Config for `npm run test:visual`: screenshots of every page, compared with the ones taken
// earlier with --update-snapshots (see the README). Not part of `npm run test:e2e` or CI.
//
// The browser runs in Playwright's official Docker image, so screenshots look the same on every
// machine. Only the browser: the tests, the build and `astro preview` run here, and the browser
// reaches localhost through Playwright's connection (`exposeNetwork`).
import { createRequire } from 'node:module';
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// The image's Playwright has to be the same version as the one installed here.
const { version } = createRequire(import.meta.url)('@playwright/test/package.json');
const browserPort = 3000;

export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: 'visual.spec.ts',
  // No platform in the names: the browser is the same Linux one on every machine.
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  // The HTML report shows each difference side by side: npx playwright show-report.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...base.use,
    connectOptions: {
      wsEndpoint: `ws://127.0.0.1:${browserPort}/`,
      exposeNetwork: '<loopback>',
    },
  },
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
  webServer: [
    {
      command: `docker run --rm --init --name playwright-visual -p ${browserPort}:${browserPort} mcr.microsoft.com/playwright:v${version}-noble npx -y playwright@${version} run-server --port ${browserPort} --host 0.0.0.0`,
      port: browserPort,
      // The first run downloads the image.
      timeout: 600_000,
      reuseExistingServer: true,
    },
    // `npm run test:visual` builds first (the tests need the sitemap), so only serve here. Always
    // this checkout's build: a server still running could show another version.
    ...(process.env.BASE_URL
      ? []
      : [{ command: 'npm run preview -- --port 4321', url: 'http://localhost:4321' }]),
  ],
});
