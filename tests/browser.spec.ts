import { test, expect } from '@playwright/test';

test('homepage has title and featured products', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1').first()).toContainText('Aster Gear');
  await expect(page.locator('text=Shop by Category')).toBeVisible();
});

test('can navigate to shop all', async ({ page }) => {
  await page.goto('/products');
  await expect(page.locator('h1').first()).toContainText('All Products');
});

test('product detail page semantic HTML', async ({ page }) => {
  await page.goto('/products');
  // Avoid tautological Next.js <main> layout assertions.
  // We instead ensure actual product data dynamically rendered is visible.
  const productLink = page.locator('h2 a').first();
  const productName = await productLink.innerText();
  
  await productLink.click();
  
  // Verify the dynamic product name actually loaded inside an h1
  await expect(page.locator('h1')).toHaveText(productName);
  
  // Verify price section
  await expect(page.locator('p.text-3xl.text-gray-900')).toBeVisible();
});

test('handles 404 for invalid product URL correctly', async ({ page }) => {
  const response = await page.goto('/products/this-is-a-fake-product-12345');
  // Next.js may return 200 on initial layout load before hitting notFound() in some configurations, so we verify UI.
  await expect(page.locator('h1')).toContainText('404');
  await expect(page.locator('text=Page Not Found')).toBeVisible();
});
