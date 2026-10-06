// A 席模块链回归（M0 起，每模块后跑）：双页 console 零错 + 关键选择器存活。
// baseURL 用运行中的 vite dev（5173）；纯只读断言，不动数据。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';
const PAGES = [
  { name: 'index', path: 'index.html', probe: ['.site-header', '.bento-grid'] },
  // orders 的 .order-filter-group 单独处理（游客态隐藏→attached；见下）
  { name: 'orders', path: 'orders.html', probe: ['.site-header'] },
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
    if (p.name === 'orders') {
      // ⑥审批1⑩行为面（回炉修正版@2026-10-07）：a-lane 匿名上下文=游客态，
      // #orderControls 由 js 动态隐藏（html 无默认 hidden）——本位锁"游客态
      // 隐藏"这一行为本身 + 结构不塌（attached）；"登录态可见"归
      // flow-experience A9 扩展锁管（此处匿名上下文测不了登录态）。
      // 求真务实组四席共中修正：旧版全局 toBeAttached 把 index 探针也一并
      // 弱化（超动机）且托付指针虚指（A9 原不锁本区）——收窄至此。
      await expect(page.locator('.order-filter-group').first()).toBeAttached();
      await expect(page.locator('#orderControls')).toBeHidden();
    }
    // 容忍 favicon 404 类噪声，只断言真 JS/CSS 错
    const real = errors.filter((e) => !/favicon|net::ERR_FAILED.*favicon/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });
}
