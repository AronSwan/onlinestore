// M5 出口验收：排印断言 / 回位双验（PDP 侧基线）/ 404 三路 / 禁忌核验 / ATC 全链 / OG 真地址。
// （product.css ≤8KB gz 与 og 假域名 grep 由 CLI 验收命令出数，见汇报）
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

test.afterEach(async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('reich_cart')).catch(() => {});
});

test('排印断言：32px Condensed 价格全站最大 + 层级字号令牌化', async ({ page }) => {
  await page.goto(BASE + 'product.html?id=00000001', { waitUntil: 'networkidle' });
  await page.waitForSelector('.pdp-layout');
  const typo = await page.evaluate(() => {
    const gs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      priceSize: gs('.pdp-price', 'fontSize'),
      priceFamily: gs('.pdp-price', 'fontFamily'),
      priceWeight: gs('.pdp-price', 'fontWeight'),
      nameSize: parseFloat(gs('.pdp-name', 'fontSize')),
      descSize: gs('.pdp-desc', 'fontSize'),
      descMaxWidth: gs('.pdp-desc', 'maxWidth'),
      dtSize: gs('.pdp-spec-row dt', 'fontSize'),
      ddSize: gs('.pdp-spec-row dd', 'fontSize'),
      atcHeight: gs('.pdp-atc', 'minHeight'),
      trustSize: gs('.pdp-trust-line', 'fontSize'),
      noCardInCard: !document.querySelector('.pdp-specs .bento-card, .pdp-specs [style*="background"]'),
    };
  });
  expect(typo.priceSize).toBe('32px');
  expect(typo.priceFamily).toContain('Barlow Condensed');
  expect(typo.priceWeight).toBe('600');
  expect(typo.nameSize).toBeGreaterThanOrEqual(24);
  expect(typo.nameSize).toBeLessThanOrEqual(32);
  expect(typo.descSize).toBe('15px');
  expect(parseFloat(typo.descMaxWidth)).toBeGreaterThan(400); // 32em
  expect(typo.dtSize).toBe('12px');
  expect(typo.ddSize).toBe('14px');
  expect(typo.atcHeight).toBe('48px');
  expect(typo.trustSize).toBe('12px');
  expect(typo.noCardInCard).toBe(true);
});

test('回位双验·PDP 侧基线：scrollRestoration=auto + 原生后退回列表滚动位', async ({ page }) => {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(300);
  // 卡片可点化前的等价路径：JS 导航到 PDP 再后退（bfcache/scrollRestoration 基线）
  await page.evaluate(() => { window.location.href = '/product.html?id=00000003'; });
  await page.waitForURL(/product\.html/);
  await page.waitForSelector('.pdp-layout');
  const mode = await page.evaluate(() => history.scrollRestoration);
  expect(mode).toBe('auto');
  await page.goBack();
  await page.waitForURL(/index\.html/);
  await page.waitForTimeout(600);
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(600); // 原生基线生效（快照兜底在 M4 列表侧补强）
});

test('404 三路：缺参 / id 非法 / 库内查无 —— 页内诚实空态不伪 404', async ({ page }) => {
  for (const url of ['product.html', 'product.html?id=abc', 'product.html?id=999']) {
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await expect(page.locator('.pdp-empty-title')).toHaveText('这只包可能先走一步了。');
    await expect(page.locator('.pdp-empty-back')).toHaveAttribute('href', 'index.html#featured-collections');
    // HTTP 层仍是 200 HTML（演示站诚实口径：不抛伪 404 状态码）
    const status = await page.evaluate(async () => (await fetch(location.pathname + location.search)).status);
    expect(status).toBe(200);
  }
});

test('禁忌核验：无倒计时 / 无假五星 / 面包屑≤一级 / 色块≤2', async ({ page }) => {
  await page.goto(BASE + 'product.html?id=00000002', { waitUntil: 'networkidle' });
  await page.waitForSelector('.pdp-layout');
  const audit = await page.evaluate(() => {
    const text = document.body.textContent || '';
    const crumbLinks = document.querySelectorAll('.pdp-breadcrumb a').length;
    // "整页色块≤2"：大面积（≥4000px²）非白系实底块（按钮/链接/图不计——CTA 不是色块）
    const colorBlocks = Array.from(document.querySelectorAll('.product-detail *')).filter((el) => {
      if (el.closest('button, a') || el.tagName === 'IMG' || el.tagName === 'PICTURE') return false;
      const cs = getComputedStyle(el);
      if (cs.backgroundColor === 'transparent') return false;
      const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return false; // oklch() 等非 rgb 记法不计
      if (m[4] !== undefined && parseFloat(m[4]) === 0) return false; // 全透明
      const nearWhite = [+m[1], +m[2], +m[3]].every((c) => c >= 238); // 白/微暖底不算
      if (nearWhite) return false;
      const r = el.getBoundingClientRect();
      return r.width * r.height >= 4000;
    });
    return {
      countdown: !!document.querySelector('[class*="countdown"],[class*="timer"],[data-countdown]'),
      stars: (text.match(/★|☆/g) || []).length,
      rating: !!document.querySelector('[class*="rating"],[class*="stars"]'),
      crumbLinks,
      colorBlocks: colorBlocks.length,
    };
  });
  expect(audit.countdown).toBe(false);
  expect(audit.stars).toBe(0);
  expect(audit.rating).toBe(false);
  expect(audit.crumbLinks).toBeLessThanOrEqual(1);
  expect(audit.colorBlocks).toBeLessThanOrEqual(2);
});

test('PDP ATC 全链：入袋+徽章+toast；PDP 不自动跳结算不开面板', async ({ page }) => {
  await page.goto(BASE + 'product.html?id=00000001', { waitUntil: 'networkidle' });
  await page.waitForSelector('.pdp-atc');
  await page.locator('.pdp-atc').click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  await page.waitForFunction(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el && el.textContent.trim() === '1';
  }, null, { timeout: 5000 });
  // 不自动开面板（PDP 不跳结算——吸底条同理）
  await page.waitForTimeout(400);
  const overlayOpen = await page.evaluate(() => {
    const o = document.querySelector('.cart-overlay');
    return !!o && (o.classList.contains('visible') || o.style.display === 'block');
  });
  expect(overlayOpen).toBe(false);
  expect(page.url()).toContain('product.html');
  // toast 的"去结算"= 开面板（同语言反馈）
  await page.locator('.reich-toast-confirm').click();
  await expect(page.locator('.cart-overlay')).toHaveClass(/visible/);
});

test('吸底条第二入口（移动）与 OG/schema 真地址', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'product.html?id=00000006', { waitUntil: 'networkidle' });
  await page.waitForSelector('.pdp-atc-bar');
  await expect(page.locator('.pdp-atc-bar')).toBeVisible();
  await page.locator('.pdp-atc-bar-btn').click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  const seo = await page.evaluate(() => ({
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    ld: (() => { try { return JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent); } catch (e) { return null; } })(),
  }));
  expect(seo.ogImage).toMatch(/^https?:\/\/[^/]*\/images\//); // 运行时真 origin，非假域名
  expect(seo.canonical).toContain('product.html?id=');
  expect(seo.ld['@type']).toBe('Product');
  expect(seo.ld.offers.price).toBe('88');
});
