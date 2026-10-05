// M2 出口验收（蓝图四节 checklist）：冻结契约五 API 活体 + C5 新面板断言 + 旧 localStorage 兼容。
// 只动 reich_cart / reich_wishlist 键（自己的数据），afterEach 清场。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

test.use({ storageState: undefined });

async function ready(page) {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
}

async function badgeText(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el ? el.textContent.trim() : null;
  });
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem('reich_cart');
    localStorage.removeItem('reich_wishlist');
  });
});

test.describe('M2 冻结契约五 API 活体', () => {
  test('① [data-add-to-cart] 文档委托：点 .btn-bag 入袋+徽章计数', async ({ page }) => {
    await ready(page);
    await page.locator('.btn-bag').first().click();
    await page.waitForFunction(() => {
      const c = JSON.parse(localStorage.getItem('reich_cart') || '[]');
      return c.length === 1 && c[0].productQuantity === 1;
    }, null, { timeout: 5000 });
    expect(await badgeText(page)).toBe('1');
  });

  test('② .reich-product-card 兜底：按钮缺 data-* 从卡上下文补全', async ({ page }) => {
    await ready(page);
    // 契约语义：按钮缺 sku/name/price/pic（只有 id 与动作位）时从卡上下文补全。
    // productId 本就是 addToCart 必填参数（卡外无来源），不属于兜底域。
    await page.evaluate(() => {
      const card = document.querySelector('.reich-product-card');
      const btn = document.createElement('button');
      btn.dataset.addToCart = 'true';
      btn.dataset.productId = card.dataset.productId;
      btn.textContent = '裸按钮';
      btn.id = 'm2-bare-atc';
      card.querySelector('.cell-body, .featured-body').appendChild(btn);
    });
    await page.click('#m2-bare-atc');
    await page.waitForFunction(() => {
      const c = JSON.parse(localStorage.getItem('reich_cart') || '[]');
      return c.length === 1 && c[0].productName && c[0].productPrice > 0;
    }, null, { timeout: 5000 });
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem('reich_cart'))[0]);
    expect(item.productName.length).toBeGreaterThan(0);
    expect(item.productPrice).toBeGreaterThan(0);
  });

  test('③ showCart 公开入口（navigation-icons 走 .site-cart-btn）', async ({ page }) => {
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
    await expect(page.locator('.cart-overlay')).toBeVisible();
  });

  test('④ pulseCartBadge：加购后徽章 .pulse 重触发', async ({ page }) => {
    await ready(page);
    await page.locator('.btn-bag').first().click();
    await page.waitForFunction(() => {
      const el = document.querySelector('.site-cart-badge, #cart-badge');
      return el && el.classList.contains('pulse');
    }, null, { timeout: 5000 });
    // pulse 类存在即证（动画 0.3s 后类仍在——cart.js 不摘类，只靠重触发换帧）
  });

  test('⑤ 徽章选择器组：全族徽章同步计数', async ({ page }) => {
    await ready(page);
    await page.evaluate(() => {
      // 在页尾放一枚旧词表徽章，验证选择器组没丢
      const d = document.createElement('span');
      d.className = 'cart-count';
      document.body.appendChild(d);
    });
    await page.locator('.btn-bag').first().click();
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('.cart-badge, .cart-count, #cart-badge, #cart-count, .site-cart-badge');
      return els.length >= 2 && Array.from(els).every((e) => e.textContent.trim() === '1');
    }, null, { timeout: 5000 });
  });
});

test.describe('M2 C5 新面板', () => {
  async function seedAndOpen(page) {
    await ready(page);
    await page.evaluate(() => {
      // 旧形状数据：selected 有 true 有 false（M2 前存量）——新面板应全量呈现
      localStorage.setItem('reich_cart', JSON.stringify([
        { productId: '1', productSkuId: '00000001', productName: '渐变褶皱手袋', productBrand: 'Reich',
          productPrice: 299, productQuantity: 2, productPic: '/images/products/product-1.jpg', selected: false },
        { productId: '6', productSkuId: '00000006', productName: '粉色 V 纹链条包', productBrand: 'Reich',
          productPrice: 88, productQuantity: 1, productPic: '/images/products/product-6.jpg', selected: true },
      ]));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.cartManager && !!window.cartManager.cartUI, null, { timeout: 8000 });
    await page.click('.site-cart-btn');
    await expect(page.locator('.cart-overlay')).toHaveClass(/visible/);
  }

  test('勾选砍除+旧 localStorage 兼容：selected=false 老数据照样进面板，全量计数', async ({ page }) => {
    await seedAndOpen(page);
    // 勾选框不存在
    await expect(page.locator('.cart-overlay .item-checkbox')).toHaveCount(0);
    await expect(page.locator('.cart-overlay input[type="checkbox"]')).toHaveCount(0);
    // 共 3 件（2+1 求和）· ¥686（299×2+88 全量）
    await expect(page.locator('.cart-total-row .total-count')).toHaveText('3');
    await expect(page.locator('.cart-total-row .total-price')).toHaveText('¥686');
  });

  test('头部口径"购物袋"+ C28 qty 算术行', async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.locator('.cart-header h3')).toHaveText('购物袋');
    // qty=2 → "¥299 × 2 = ¥598"；qty=1 → 只 "¥88"（B5：整数无 .00）
    await expect(page.locator('.cart-item').first().locator('.item-price-line')).toHaveText('¥299 × 2 = ¥598');
    await expect(page.locator('.cart-item').nth(1).locator('.item-price-line')).toHaveText('¥88');
  });

  test('B6 信任行在总价下方结算钮上方', async ({ page }) => {
    await seedAndOpen(page);
    const trust = page.locator('.cart-trust-line');
    await expect(trust).toHaveText(/含运费 · 30 天可退/);
    const order = await page.evaluate(() => {
      // a.compareDocumentPosition(b) 含 FOLLOWING ⇔ b 在 a 之后
      const trust = document.querySelector('.cart-trust-line');
      const afterTotal = (document.querySelector('.cart-total-row').compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const beforeCheckout = (trust.compareDocumentPosition(document.querySelector('.checkout-btn')) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      return { afterTotal, beforeCheckout };
    });
    expect(order.afterTotal).toBe(true);    // 信任行在总价行之后
    expect(order.beforeCheckout).toBe(true); // 且在结算钮之前
  });

  test('两步清空：第一点亮确认态 3s 还原，第二点整袋清空', async ({ page }) => {
    await seedAndOpen(page);
    const btn = page.locator('.clear-bag-btn');
    await btn.click();
    await expect(btn).toHaveText('再点一次清空');
    await expect(btn).toHaveClass(/armed/);
    // 3s 计时还原
    await expect(btn).toHaveText('清空袋子', { timeout: 4000 });
    // 再走两步：这次第二点直接清
    await btn.click();
    await btn.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('reich_cart') || '[]').length === 0, null, { timeout: 5000 });
    await expect(page.locator('.cart-empty')).toBeVisible();
  });

  test('M2 过渡态：加购只脉冲不自动开面板', async ({ page }) => {
    await ready(page);
    await page.evaluate(() => localStorage.removeItem('reich_cart'));
    await page.locator('.btn-bag').first().click();
    await page.waitForFunction(() => {
      const el = document.querySelector('.site-cart-badge, #cart-badge');
      return el && el.classList.contains('pulse');
    }, null, { timeout: 5000 });
    await page.waitForTimeout(400);
    const overlayVisible = await page.evaluate(() => {
      const o = document.querySelector('.cart-overlay');
      return !!o && (o.style.display === 'block' || o.classList.contains('visible'));
    });
    expect(overlayVisible).toBe(false);
  });

  test('B5 合计金额 formatPrice：整数直出（无 .00）', async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.locator('.cart-total-row .total-price')).toHaveText('¥686');
  });
});
