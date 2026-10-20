import { defineConfig, devices } from '@playwright/test';

// Runs against BASE_URL when it's set (a deployed preview, as CI does), otherwise against a
// local production build served by `astro preview`.
const baseURL = process.env.BASE_URL;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: baseURL ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  // The engines behind Chrome, Firefox and Safari, plus two phones for the mobile layout.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ],
  webServer: baseURL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4321',
        url: 'http://localhost:4321',
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
