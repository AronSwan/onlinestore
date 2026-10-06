// site-header 导航 hover/aria-current 现代 spec（2026-10-06）
// 考古来源：nav-button 三件（hover-optimized/smooth-hover/state-fix，1669 行）针对已退役的
// .navbar-luxury/.nav-link-luxury/data-state 旧导航体系；F4 归一后 hover 态语义活在
// site-header.js 渲染的 .site-nav a 上（css/components/site-header.css:41-77）——
// 本件是那次考古唯一值得重锚的存活行为：下划线 scaleX 切换 + aria-current 标记。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

// 过渡口径：下划线 transform 过渡 0.2s（--dur-fast）——hover 后等 0.3s 落定再读 computed
const TRANSITION_SETTLE_MS = 300;

test('hover 态切换：.site-nav a 下划线 scaleX(0)→(1) 且变色', async ({ page }) => {
  await page.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
  const link = page.locator('.site-nav a', { hasText: '手袋' }).first();
  await expect(link).toBeVisible();

  const read = (target) => target.evaluate((el) => ({
    matrix: getComputedStyle(el, '::after').transform,
    color: getComputedStyle(el).color,
  }));

  const before = await read(link);
  await link.hover();
  await page.waitForTimeout(TRANSITION_SETTLE_MS);
  const after = await read(link);

  // scaleX(0) → matrix(0,0,0,1,0,0)；scaleX(1) → matrix(1,0,0,1,0,0)（合成器动画，无重排）
  expect(before.matrix).toBe('matrix(0, 0, 0, 1, 0, 0)');
  expect(after.matrix).toBe('matrix(1, 0, 0, 1, 0, 0)');
  expect(after.color).not.toBe(before.color); // hover 换 --candy-blush-ink
});

test('aria-current 标记：orders 页"订单"项持 aria-current="page"，index 无', async ({ page }) => {
  await page.goto(BASE + 'orders.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('订单');

  await page.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveCount(0);
});
