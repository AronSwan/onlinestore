import { test, expect } from '@playwright/test';

// 购物车刷新与 Blob URL 释放验证
// - 在运行中的预览页（http://localhost:5173/）执行
// - 点击“加入购物车”或直接调用 cartManager.addItem
// - 验证 .cart-count 文本是否 +1
// - 验证 [data-cart-icon] 图标的 blob: URL 切换，旧 URL 不可再访问（被 revoke）

test.describe('购物车图标刷新与 Blob URL 释放', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/';

  async function getCartCount(page) {
    const counts = await page.$$eval('.cart-count', els => els.map(e => e.textContent?.trim()).filter(Boolean));
    // 取第一个可解析数字的计数
    for (const txt of counts) {
      const num = parseInt(txt, 10);
      if (!Number.isNaN(num)) return num;
    }
    return null;
  }

  async function getCartIconStates(page) {
    return await page.$$eval('[data-cart-icon]', (imgs) => {
      return imgs.map(img => ({
        currentSrc: img.src,
        blobUrl: img.dataset.svgBlobUrl || '',
        isBlob: (img.dataset.svgBlobUrl || img.src || '').startsWith('blob:'),
      }));
    });
  }

  async function waitForCartCountIncrease(page, prevCount) {
    await page.waitForFunction((oldCount) => {
      const els = Array.from(document.querySelectorAll('.cart-count'));
      for (const e of els) {
        const n = parseInt(e.textContent?.trim() || '', 10);
        if (!Number.isNaN(n) && (oldCount == null || n > oldCount)) {
          return true;
        }
      }
      return false;
    }, prevCount, { timeout: 5000 });
  }

  async function waitForIconsUpdated(page, prevStates) {
    await page.waitForFunction((prev) => {
      const imgs = Array.from(document.querySelectorAll('[data-cart-icon]'));
      // 至少有一个图标的 blobUrl 或 src 发生变化
      return imgs.some((img, idx) => {
        const prevState = prev[idx];
        const curBlob = img.dataset.svgBlobUrl || '';
        const curSrc = img.src || '';
        return (prevState && (prevState.blobUrl !== curBlob || prevState.currentSrc !== curSrc));
      });
    }, prevStates, { timeout: 5000 });
  }

  async function verifyOldBlobRevoked(page, oldBlobUrls) {
    // 只验证 blob: URL；非 blob 的初始 SVG 路径不在验证范围内
    const candidate = oldBlobUrls.filter(u => typeof u === 'string' && u.startsWith('blob:'));
    if (candidate.length === 0) return; // 无可验证项时跳过

    const results = await page.evaluate(async (urls) => {
      const out = [];
      for (const u of urls) {
        try {
          const res = await fetch(u);
          // 某些浏览器可能允许 fetch blob: URL，但 revoke 后通常会失败或返回非 2xx
          out.push({ url: u, ok: res?.ok === true });
        } catch (e) {
          out.push({ url: u, ok: false, error: String(e) });
        }
      }
      return out;
    }, candidate);

    // 期望所有旧 blob URL 都不可访问（ok 为 false）
    for (const r of results) {
      expect(r.ok, `旧 Blob URL 应该被 revoke：${r.url}（结果: ${JSON.stringify(r)}）`).toBeFalsy();
    }
  }

  test('点击加入购物车后，购物袋图标数字与计数即时更新，旧 Blob URL 被释放', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 等待全局 cartManager 就绪
    await page.waitForFunction(() => !!window.cartManager, null, { timeout: 5000 });

    const prevCount = await getCartCount(page);
    const prevIconStates = await getCartIconStates(page);
    const prevBlobUrls = prevIconStates.map(s => s.blobUrl).filter(Boolean);

    // 优先点击 UI 的“加入购物车”按钮；若不存在则直接调用 cartManager.addItem
    const addButtons = await page.$$('.btn-add-to-cart');
    if (addButtons.length > 0) {
      await addButtons[0].click();
    } else {
      // Fallback：直接调用业务方法，保证可验证
      await page.evaluate(() => {
        window.cartManager.addItem({ id: 'test-1', name: '测试商品', price: 99, image: '', quantity: 1 });
      });
    }

    // 等待 .cart-count +1 或任意图标发生更新
    if (prevCount != null) {
      await waitForCartCountIncrease(page, prevCount);
    } else {
      await waitForIconsUpdated(page, prevIconStates);
    }

    const newCount = await getCartCount(page);
    if (prevCount != null && newCount != null) {
      expect(newCount).toBeGreaterThan(prevCount);
    }

    // 校验图标 blob URL 切换与旧 URL revoke
    const newIconStates = await getCartIconStates(page);
    const newBlobUrls = newIconStates.map(s => s.blobUrl).filter(Boolean);

    // 至少应当出现 blob: URL（首次渲染可能是静态 SVG，更新后为 blob:）
    expect(newBlobUrls.length, '更新后至少一个图标应当使用 blob: URL').toBeGreaterThanOrEqual(1);

    // 旧 blob URL 不可访问
    await verifyOldBlobRevoked(page, prevBlobUrls);

    // 再次触发一次添加，重复验证（确保多次更新不会泄露 Blob URL）
    if (addButtons.length > 0) {
      await addButtons[0].click();
    } else {
      await page.evaluate(() => {
        window.cartManager.addItem({ id: 'test-2', name: '测试商品2', price: 199, image: '', quantity: 1 });
      });
    }

    const prev2IconStates = newIconStates;
    const prev2BlobUrls = prev2IconStates.map(s => s.blobUrl).filter(Boolean);
    if (newCount != null) {
      await waitForCartCountIncrease(page, newCount);
    } else {
      await waitForIconsUpdated(page, prev2IconStates);
    }

    const new2IconStates = await getCartIconStates(page);
    const new2BlobUrls = new2IconStates.map(s => s.blobUrl).filter(Boolean);

    expect(new2BlobUrls.length).toBeGreaterThanOrEqual(1);
    await verifyOldBlobRevoked(page, prev2BlobUrls);
  });
});