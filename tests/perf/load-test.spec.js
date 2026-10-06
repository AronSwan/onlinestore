import { test, expect } from '@playwright/test';

const BLOCKED_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'picsum.photos'
];

test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (BLOCKED_HOSTS.some((host) => url.includes(host))) {
        return route.abort();
      }
      return route.continue();
    });
  });

  // ── 阈值口径（2026-10-06 测试升级席重校；测量环境：本机 chromium / vite dev
  //    5173 复用已起实例 / 第三方域 route.abort 屏蔽）──
  // 首页加载：单独串行三遍实测 597/929/887ms（中位 ≈887）；全套并行工况（其余
  //   spec 同跑争用 vite 按需编译）实测 1651ms（暖）~9045ms（首触冷编译）。
  //   → 阈值 10000ms：覆盖并行冷触观测极值，≈暖态中位 11 倍余量。本件是 dev
  //   server 冒烟锁（守"未劣化一个数量级"），非生产构建性能验收——生产口径由
  //   构建产物另行验收，勿混引。
  // 导航交互：.nav-link-luxury 已随 F4 归一退役 → .site-nav a。单独串行三遍
  //   实测 389/275/371ms（中位 ≈371，含 Playwright actionability 检查）；全套
  //   并行工况实测 842~2010ms。→ 阈值 2500ms：覆盖并行观测极值 2010 +25% 余量，
  //   ≈单独中位 6.7 倍。口径=click() 往返（actionability+派发），非导航完成时点。
  test('首页加载性能', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    console.log(`首页加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000);
  });

  test('导航交互响应时间', async ({ page }) => {
    await page.goto('/');

    const link = page.locator('.site-nav a').first();
    const startTime = Date.now();
    await link.click();
    const responseTime = Date.now() - startTime;

    console.log(`导航点击响应时间: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(2500);
  });
});
