import { test, expect } from '@playwright/test';

// 购物车刷新验证（2026-10-06 测试升级席修漂移版）
// 漂移修复：addItem→addToCart（M2 冻结契约 API）；.btn-add-to-cart→.btn-bag
// （[data-add-to-cart] 文档委托）；Blob URL 释放断言域整体退役（svgBlobUrl 机制
// 已随 F4 归一消亡，见 docs/BACKLOG.md 2026-10-06 退役记录）。
// 本件补 M2 新列序锁：[缩略][名称两行（名称+价格行）][步进器][×]。
const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

const SEED_ITEM = {
  productId: '1', productSkuId: '00000001', productName: '渐变褶皱手袋',
  productBrand: 'Reich', productPrice: 299, productQuantity: 1,
  productPic: '/images/products/product-1.jpg', selected: true,
};

async function ready(page) {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
}

async function badgeCount(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el ? parseInt(el.textContent.trim(), 10) : null;
  });
}

test.describe('购物车计数刷新与 API 漂移修复', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('reich_cart')).catch(() => {});
  });

  test('加购后徽章计数即时 +1，二次加购再 +1（addToCart 活路）', async ({ page }) => {
    await ready(page);
    const prev = (await badgeCount(page)) ?? 0;

    const bags = page.locator('.btn-bag');
    if (await bags.count()) {
      await bags.first().click();
    } else {
      // Fallback：直接调冻结契约 API（addToCart——旧 addItem 已不存在）
      await page.evaluate(async () => {
        await window.cartManager.addToCart({
          productId: 't1', productSkuId: 'test-1', productName: '测试商品',
          productBrand: 'Reich', productPrice: 99, productQuantity: 1, productPic: '',
        });
      });
    }
    await page.waitForFunction((n) => {
      const el = document.querySelector('.site-cart-badge, #cart-badge');
      return el && parseInt(el.textContent.trim(), 10) === n + 1;
    }, prev, { timeout: 5000 });
    expect(await badgeCount(page)).toBe(prev + 1);

    // 再次加购（同路重复验证）
    if (await bags.count()) {
      await bags.first().click();
    } else {
      await page.evaluate(async () => {
        await window.cartManager.addToCart({
          productId: 't2', productSkuId: 'test-2', productName: '测试商品2',
          productBrand: 'Reich', productPrice: 199, productQuantity: 1, productPic: '',
        });
      });
    }
    await page.waitForFunction((n) => {
      const el = document.querySelector('.site-cart-badge, #cart-badge');
      return el && parseInt(el.textContent.trim(), 10) === n + 2;
    }, prev, { timeout: 5000 });
    expect(await badgeCount(page)).toBe(prev + 2);
  });

  test('M2 新列序：缩略 → 名称两行（名称+价格行）→ 步进器 → ×，DOM 序与结构', async ({ page }) => {
    await ready(page);
    await page.evaluate((item) => localStorage.setItem('reich_cart', JSON.stringify([item])), SEED_ITEM);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
    await page.click('.site-cart-btn');
    await expect(page.locator('.cart-overlay')).toHaveClass(/visible/);

    const row = page.locator('.cart-item').first();
    await expect(row.locator('.item-image img')).toHaveAttribute('alt', '渐变褶皱手袋'); // 缩略
    await expect(row.locator('.item-details .item-name')).toHaveText('渐变褶皱手袋');   // 名称行
    await expect(row.locator('.item-details .item-price-line')).toHaveText('¥299');      // 价格行（qty=1 单价只显一次）
    // 步进器：− span + 三件套
    await expect(row.locator('.item-quantity button[aria-label="减少数量"]')).toBeVisible();
    await expect(row.locator('.item-quantity button[aria-label="增加数量"]')).toBeVisible();
    await expect(row.locator('.item-quantity span').first()).toHaveText('1');

    // DOM 列序四段：image → details → quantity → remove（M2 C5 终裁）
    const order = await row.evaluate((el) => {
      const seq = (sel) => {
        const child = el.querySelector(sel);
        return child ? Array.from(el.children).indexOf(child) : -1;
      };
      return {
        image: seq('.item-image'), details: seq('.item-details'),
        quantity: seq('.item-quantity'), remove: seq('.item-remove'),
        nameBeforePrice: (() => {
          const d = el.querySelector('.item-details');
          const n = d?.querySelector('.item-name'); const p = d?.querySelector('.item-price-line');
          return !!(n && p && (n.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING));
        })(),
      };
    });
    expect(order.image).toBe(0);
    expect(order.details).toBe(1);
    expect(order.quantity).toBe(2);
    expect(order.remove).toBe(3);
    expect(order.nameBeforePrice).toBe(true);
  });
});
