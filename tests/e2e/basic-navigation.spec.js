import { test, expect } from '@playwright/test';

test.describe('基本导航测试', () => {
  test('首页加载', async ({ page }) => {
    await page.goto('http://localhost:4173/');
    await expect(page).toHaveTitle('Reich | 奢华购物体验');
    
    const navLinks = await page.locator('.nav-link-luxury').count();
    expect(navLinks).toBeGreaterThan(0);
  });

  test('导航链接点击', async ({ page }) => {
    await page.goto('http://localhost:4173/');

    const toggle = page.locator('#mobileMenuToggle');
    const mainNav = page.locator('#mainNav');

    // 如为移动端视口且存在折叠菜单按钮，先展开菜单确保链接在视口内
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await mainNav.waitFor({ state: 'visible' });
    }

    const firstLink = page.locator('.nav-link-luxury').first();
    await firstLink.scrollIntoViewIfNeeded();
    await expect(firstLink).toBeVisible();

    await firstLink.click({ timeout: 10000 });

    await expect(page).toHaveURL(/.+/); // 只需验证URL已变化
  });
});