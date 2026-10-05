// A 席模块链验收专用（不打扰 CI 配置）：同 unit.config.js 但无 webServer——
// 断言全部打向运行中的 vite dev(5173)，产物抽查另跑 vite preview。
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  reporter: 'list',
  use: { actionTimeout: 0, baseURL: 'http://localhost:5173/' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
