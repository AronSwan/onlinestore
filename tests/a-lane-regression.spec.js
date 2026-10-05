// A 席模块链回归（M0 起，每模块后跑）：双页 console 零错 + 关键选择器存活。
// baseURL 用运行中的 vite dev（5173）；纯只读断言，不动数据。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';
const PAGES = [
  { name: 'index', path: 'index.html', probe: ['.site-header', '.bento-grid'] },
  { name: 'orders', path: 'orders.html', probe: ['.site-header', '.order-filter-group'] },
];

for (const p of PAGES) {
  test(`${p.name}: console 零错 + 结构存活`, async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    for (const sel of p.probe) {
      await expect(page.locator(sel).first()).toBeVisible();
    }
    // 容忍 favicon 404 类噪声，只断言真 JS/CSS 错
    const real = errors.filter((e) => !/favicon|net::ERR_FAILED.*favicon/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });
}
