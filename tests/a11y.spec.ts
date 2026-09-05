import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('Homepage should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Product Listing should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/products');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Product Detail should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/products');
    const productLink = page.locator('h2 a').first();
    await productLink.click();
    await expect(page.locator('h1')).toBeVisible(); // wait for page to load
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Cart should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/cart');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
