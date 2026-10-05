// M3 出口验收（蓝图 M3）：同款二次 toast / reduced-motion 跳飞只脉冲 / 步进器不误弹 /
// 队列上限 2 / hover 暂停 / 去结算=开面板 / 飞行 clone 层级与清场。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

async function ready(page, extra = {}) {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
}

async function badgeCount(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el ? parseInt(el.textContent.trim(), 10) : null;
  });
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('reich_cart')).catch(() => {});
});

test('同款二次加购：合并路径补发 itemAdded{merged} → toast 说"又放进一只"', async ({ page }) => {
  await ready(page);
  const first = page.locator('.bento-card .btn-bag').first();
  await first.click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  await expect(page.locator('.reich-toast-message')).toContainText('放进袋子了');
  await page.waitForTimeout(300);
  // toast 5s 内自动在——等待其退场后再点第二次，避免队列让位干扰断言
  await page.locator('.reich-toast-dismiss').click();
  await first.click(); // 第二次：同款合并
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  await expect(page.locator('.reich-toast-message')).toContainText('又放进一只');
  await expect(page.locator('.reich-toast-message')).toContainText('2 只');
  expect(await badgeCount(page)).toBe(2);
});

test('reduced-motion：飞行整体跳过，只徽章脉冲', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.locator('.bento-card .btn-bag').first().click();
  // 脉冲照常
  await page.waitForFunction(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el && el.classList.contains('pulse');
  }, null, { timeout: 5000 });
  // 无飞行克隆（fixed 定位、z-index 599 的 img）
  await page.waitForTimeout(150);
  const clones = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body > img')).filter((i) =>
      getComputedStyle(i).position === 'fixed' && getComputedStyle(i).zIndex === '599').length);
  expect(clones).toBe(0);
  // toast 仍给（反馈本体不因 reduced-motion 缺席）
  await expect(page.locator('.reich-toast')).toHaveCount(1);
});

test('步进器 +/- 不触发加购 toast（quantityUpdated ≠ itemAdded）', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.setItem('reich_cart', JSON.stringify([
      { productId: '1', productSkuId: '00000001', productName: '渐变褶皱手袋', productBrand: 'Reich',
        productPrice: 299, productQuantity: 1, productPic: '/images/products/product-1.jpg', selected: true },
    ]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
  await page.click('.site-cart-btn');
  await expect(page.locator('.cart-overlay')).toHaveClass(/visible/);
  await page.locator('.cart-item .item-quantity button').nth(1).click(); // +
  await expect(page.locator('.cart-total-row .total-count')).toHaveText('2', { timeout: 5000 });
  await expect(page.locator('.cart-total-row .total-price')).toHaveText('¥598');
  await expect(page.locator('.reich-toast')).toHaveCount(0);
});

test('队列最多 2 条：连点三款，最老让位', async ({ page }) => {
  await ready(page);
  const bags = page.locator('.bento-card .btn-bag');
  const n = Math.min(3, await bags.count());
  expect(n).toBe(3);
  for (let i = 0; i < n; i++) {
    await bags.nth(i).click();
    await page.waitForTimeout(180); // 120ms toast 出场间隔错开
  }
  await page.waitForTimeout(200);
  expect(await page.locator('.reich-toast').count()).toBeLessThanOrEqual(2);
});

test('toast ≥5s 自灭 + hover 暂停续走', async ({ page }) => {
  await ready(page);
  await page.locator('.bento-card .btn-bag').first().click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  // hover 冻结：悬停 5.8s（超过默认 5.2s 寿命）仍在场
  await page.locator('.reich-toast').hover();
  await page.waitForTimeout(5800);
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  // 移出续走：剩余寿命（≈4.9s，悬停前进场约 0.3s）+ 缓冲内退场
  await page.mouse.move(10, 300);
  await expect(page.locator('.reich-toast')).toHaveCount(0, { timeout: 6500 });
});

test('toast"去结算"=打开购物袋面板（不撞未开通死胡同）', async ({ page }) => {
  await ready(page);
  await page.locator('.bento-card .btn-bag').first().click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  await page.locator('.reich-toast-confirm').click();
  await expect(page.locator('.cart-overlay')).toHaveClass(/visible/);
});

test('飞行 clone：z-index 低于 --z-toast，动画后自我清场', async ({ page }) => {
  await ready(page);
  await page.locator('.bento-card .btn-bag').first().click();
  // 飞行进行中：fixed img，z-index 599（< toast 600）
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('body > img')).some((i) => {
      const cs = getComputedStyle(i);
      return cs.position === 'fixed' && cs.zIndex === '599';
    });
  }, null, { timeout: 3000 });
  // ≤400ms 后清场（--dur-flight 上限）
  await page.waitForFunction(() => {
    return !Array.from(document.querySelectorAll('body > img')).some((i) => {
      const cs = getComputedStyle(i);
      return cs.position === 'fixed' && cs.zIndex === '599';
    });
  }, null, { timeout: 1000 });
});
