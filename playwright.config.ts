import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 40000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3107',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      testMatch: /cross-browser.spec.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /cross-browser.spec.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npx tsx scripts/e2e-server.ts',
    url: 'http://127.0.0.1:3107/api/demo-users',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
