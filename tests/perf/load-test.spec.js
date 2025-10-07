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

  test('首页加载性能', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    console.log(`首页加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(4000); // 屏蔽第三方资源后维持较严格阈值
  });

  test('导航交互响应时间', async ({ page }) => {
    await page.goto('/');
    
    const link = page.locator('.nav-link-luxury').first();
    const startTime = Date.now();
    await link.click();
    const responseTime = Date.now() - startTime;
    
    console.log(`导航点击响应时间: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(500);
  });
});