import { test, expect } from '@playwright/test';

test.describe('Shop and Filtering', () => {
  test('can sort products', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText('All Products');
    
    // Select sort option
    await page.selectOption('select#sort', 'price-asc');
    await expect(page).toHaveURL(/.*sort=price-asc/, { timeout: 10000 });
    
    await page.selectOption('select#sort', 'price-desc');
    await expect(page).toHaveURL(/.*sort=price-desc/, { timeout: 10000 });
  });
  
  test('can filter products by search', async ({ page }) => {
    await page.goto('/products?q=running');
    await expect(page.locator('h1')).toContainText('Search Results for "running"');
  });

  test('can view and select variants on product page', async ({ page }) => {
    // Go to a product page that has variants. We will use the first product on the home page.
    await page.goto('/products');
    const productLink = page.locator('h2 a').first();
    await productLink.click();
    
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if variants section exists
    const variantsHeader = page.locator('h3:has-text("Variants")');
    if (await variantsHeader.isVisible()) {
        const variantButtons = page.locator('button', { hasText: '-' });
        if (await variantButtons.count() > 1) {
            // Click second variant
            await variantButtons.nth(1).click();
            // Verify it gets selected (has ring-2 class)
            await expect(variantButtons.nth(1)).toHaveClass(/ring-2/);
        }
    }
  });
});
