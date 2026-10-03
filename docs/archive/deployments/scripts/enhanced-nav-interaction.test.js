import { test, expect } from '@playwright/test';
import { EnhancedNavigationInteraction } from '../js/enhanced-nav-interaction.js';

test.describe('EnhancedNavigationInteraction', () => {
  let enhancer;

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    enhancer = new EnhancedNavigationInteraction();
    await enhancer.init();
  });

  test('should initialize correctly', async ({ page }) => {
    const links = await page.locator('.nav-link-luxury').count();
    expect(links).toBeGreaterThan(0);
    expect(enhancer.isInitialized).toBeTruthy();
  });

  test('should handle hover effects', async ({ page }) => {
    const link = await page.locator('.nav-link-luxury').first();
    await link.hover();
    await expect(link).toHaveClass(/hover-enhanced/);
  });

  test('should handle click effects', async ({ page }) => {
    const link = await page.locator('.nav-link-luxury').first();
    await link.click();
    await expect(link).toHaveClass(/active/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const link = await page.locator('.nav-link-luxury').first();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(link).toHaveClass(/active/);
  });
});