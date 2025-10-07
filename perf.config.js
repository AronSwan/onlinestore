import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/perf',
  timeout: 120 * 1000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    actionTimeout: 0,
    trace: 'on',
    video: 'on',
    baseURL: 'http://localhost:4173/',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 180 * 1000
  },
});