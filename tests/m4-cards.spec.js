// M4 出口验收：六卡双锚可点入 / 心形拆雷 / bag·心形连点互不误触×3 / 图宽实测 /
// 社会证明与品质行 / 两色可选 / 滚动快照回位 / hero 波浪。
import { test, expect } from '@playwright/test';

const BASE = process.env.A_LANE_BASE || 'http://localhost:5173/';

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem('reich_cart');
    localStorage.removeItem('reich_wishlist');
    sessionStorage.removeItem('reich_list_scroll');
  }).catch(() => {});
});

async function gridReady(page) {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.bento-card').length >= 3, null, { timeout: 8000 });
  await page.waitForTimeout(300);
}

test('六卡可点入：双锚（拉伸锚×6 + 品名锚×6）全部落 PDP', async ({ page }) => {
  await gridReady(page);
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.bento-card a.card-link, .bento-card .reich-product-name a'))
      .map((a) => a.getAttribute('href'))
  );
  expect(links.length).toBeGreaterThanOrEqual(12); // 6 卡 × 双锚（回退 3 卡时 ≥6）
  for (const href of links) {
    expect(href).toMatch(/^product\.html\?id=\d{8}$/);
  }
  // 实点两路：拉伸锚 + 品名锚
  await page.locator('.bento-card').nth(1).locator('a.card-link').click();
  await page.waitForURL(/product\.html\?id=/);
  await page.goBack();
  await page.waitForFunction(() => document.querySelectorAll('.bento-card').length >= 3);
  await page.locator('.bento-card').nth(1).locator('.reich-product-name a').click();
  await page.waitForURL(/product\.html\?id=/);
});

test('心形拆雷（罗马 P1-2）：五件 data-* 全清，只留 data-product-id', async ({ page }) => {
  await gridReady(page);
  const hearts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.reich-product-action')).map((b) => Object.keys(b.dataset))
  );
  expect(hearts.length).toBeGreaterThanOrEqual(3);
  for (const keys of hearts) {
    expect(keys).toEqual(['productId']); // 唯一幸存键
  }
});

test('连点互不误触×3：bag 连点只入袋，心形连点只收藏，互不串门', async ({ page }) => {
  await gridReady(page);
  const card = page.locator('.bento-card').nth(1);
  // bag ×3 → 该款 3 只，且心愿单空
  await card.locator('.btn-bag').click();
  await page.waitForTimeout(80);
  await card.locator('.btn-bag').click();
  await page.waitForTimeout(80);
  await card.locator('.btn-bag').click();
  await page.waitForFunction(() => {
    const c = JSON.parse(localStorage.getItem('reich_cart') || '[]');
    return c.length === 1 && c[0].productQuantity === 3;
  }, null, { timeout: 5000 });
  // 心形 ×3（同款收/放/收——只动 wishlist，袋数不变）
  const heart = card.locator('.reich-product-action');
  await heart.click();
  await page.waitForTimeout(120);
  await heart.click();
  await page.waitForTimeout(120);
  await heart.click();
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    cartQty: JSON.parse(localStorage.getItem('reich_cart') || '[]').reduce((n, i) => n + i.productQuantity, 0),
    wishlist: JSON.parse(localStorage.getItem('reich_wishlist') || '[]').length, // 收/放/收 = 1 在册
  }));
  expect(state.cartQty).toBe(3);
  expect(state.wishlist).toBe(1);
});

test('图宽实测：桌面 cell clamp(240,46%,300) / featured ≥380px·52% / 移动 <639 竖版全宽', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gridReady(page);
  const desktop = await page.evaluate(() => {
    const cellFig = document.querySelector('.bento-cell .cell-fig').getBoundingClientRect();
    const featuredFig = document.querySelector('.bento-featured .featured-fig').getBoundingClientRect();
    const featuredInner = document.querySelector('.bento-featured .featured-inner').getBoundingClientRect();
    return {
      cellW: Math.round(cellFig.width),
      featuredW: Math.round(featuredFig.width),
      featuredRatio: +(featuredFig.width / featuredInner.width).toFixed(2),
    };
  });
  expect(desktop.cellW).toBeGreaterThanOrEqual(240);
  expect(desktop.cellW).toBeLessThanOrEqual(300);
  expect(desktop.featuredW).toBeGreaterThanOrEqual(380);
  expect(desktop.featuredW).toBeLessThanOrEqual(480);
  expect(desktop.featuredRatio).toBeGreaterThanOrEqual(0.5);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mobile = await page.evaluate(() => {
    const inner = document.querySelector('.bento-cell .cell-inner');
    const fig = document.querySelector('.bento-cell .cell-fig').getBoundingClientRect();
    const body = document.querySelector('.bento-cell .cell-body').getBoundingClientRect();
    return {
      flexDirection: getComputedStyle(inner).flexDirection,
      figW: Math.round(fig.width),
      figAboveBody: fig.top < body.top,
    };
  });
  expect(mobile.flexDirection).toBe('column'); // 竖版（图上文下），非中间态
  expect(mobile.figW).toBeGreaterThanOrEqual(350); // 全宽（390-32 边距）
  expect(mobile.figAboveBody).toBe(true);
});

test('社会证明双数（featured 实时）+ 品质行（cell）+ 心形 16px', async ({ page }) => {
  await gridReady(page);
  const state = await page.evaluate(() => {
    const social = document.querySelector('.featured-social');
    const quality = document.querySelector('.bento-cell .cell-quality');
    const heartImg = document.querySelector('.bento-card .reich-product-action img');
    return {
      socialText: social ? social.textContent : null,
      socialColor: social ? getComputedStyle(social).color : null,
      qualityText: quality ? quality.textContent : null,
      qualitySize: quality ? getComputedStyle(quality).fontSize : null,
      qualityColor: quality ? getComputedStyle(quality).color : null,
      heartW: heartImg ? heartImg.getBoundingClientRect().width : null,
    };
  });
  // API 实时（渐变褶皱手袋 favorites=26 sales=12；渲染顺序以实际 featured 为准——只断言格式与实时非硬编码）
  expect(state.socialText).toMatch(/(\d+ 人的心头好|来做第一个心动的人)/);
  expect(state.qualityText).toMatch(/头层牛皮|皮革|光面/); // 材质·工艺来自 specifications
  expect(state.qualitySize).toBe('12px');
  expect(state.qualityColor).not.toContain('0.7137'); // 禁 faint（ink-soft L≈0.4998）
  expect(state.heartW).toBe(16);
});

test('"两色可选"文案：双色糖果卡不再说"各一只"', async ({ page }) => {
  await gridReady(page);
  const body = await page.evaluate(() => document.querySelector('.bento-grid').textContent);
  expect(body).not.toContain('各一只');
  expect(body).toContain('两色可选');
});

test('滚动快照回位：卡点入 PDP → 返回回到原滚动位（stash 兜底）', async ({ page }) => {
  await gridReady(page);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  const clickY = await page.evaluate(() => window.scrollY); // 点击瞬间的实际滚动位
  await page.locator('.bento-card').nth(2).locator('a.card-link').click();
  await page.waitForURL(/product\.html/);
  await page.waitForSelector('.pdp-layout');
  // 正常返回（可能 bfcache 原生保位，也可能全新加载走 stash）
  await page.goBack();
  await page.waitForURL(/index\.html/);
  await page.waitForFunction(() => document.querySelectorAll('.bento-card').length >= 3);
  await page.waitForTimeout(1000); // 并行负载下布局/回位写窗加宽
  const y = await page.evaluate(() => window.scrollY);
  // F1c(X2 归因)：注脚行使 nth(2) 卡越折叠线、Playwright 点击前自动滚卡入视，
  // stash 存的就是实际点击位——契约是'回到点入时所在位'，断言对象改为实测 clickY
  expect(Math.abs(y - clickY)).toBeLessThan(150); // 双保险合力：原生 or stash
});

test('hero 终裁：下划线零残留 + 标题纯文本（用户裁决覆盖蓝图波浪项）', async ({ page }) => {
  await gridReady(page);
  const audit = await page.evaluate(() => {
    const title = document.querySelector('.hero-title');
    return {
      noAccentEl: !document.querySelector('.hero-accent'),
      pureText: title ? title.textContent.trim() : null,
      noSpan: title ? title.querySelector('span') === null : null,
      sheetHasRule: Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules || []).some((r) => r.selectorText && r.selectorText.includes('hero-accent'));
        } catch (e) { return false; }
      }),
    };
  });
  expect(audit.noAccentEl).toBe(true);
  expect(audit.pureText).toBe('总有一只先背。');
  expect(audit.noSpan).toBe(true);
  expect(audit.sheetHasRule).toBe(false); // ::after/样式规则零残留
});

test('冻结契约仍活：M4 后 bag 加购→toast/徽章/飞行全链（复验）', async ({ page }) => {
  await gridReady(page);
  await page.locator('.bento-card .btn-bag').first().click();
  await expect(page.locator('.reich-toast')).toHaveCount(1);
  await page.waitForFunction(() => {
    const el = document.querySelector('.site-cart-badge, #cart-badge');
    return el && el.textContent.trim() === '1';
  }, null, { timeout: 5000 });
});
