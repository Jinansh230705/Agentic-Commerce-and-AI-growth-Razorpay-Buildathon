import { test, expect } from '@playwright/test';

test.describe('Cart Flow', () => {
  test('cart shows empty state initially', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    await expect(page.locator('text=Continue Shopping')).toBeVisible();
  });

  test('can add a product to cart and modify quantities', async ({ page }) => {
    // Navigate to a product page
    await page.goto('/products');
    const productLink = page.locator('h2 a').first();
    await productLink.click();

    // Ensure we are on a product page
    await expect(page.locator('h1')).toBeVisible();

    // Click "Add to cart"
    page.on('dialog', dialog => dialog.accept()); // accept the "Added to cart!" alert
    await page.click('button:has-text("Add to cart")');

    // Go to cart
    await page.goto('/cart');

    // Verify item is in cart
    await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();
    await expect(page.locator('ul[role="list"] li')).toHaveCount(1);
    
    // Check initial subtotal (basic check to see if elements exist)
    await expect(page.locator('text=Subtotal')).toBeVisible();

    // Increment quantity
    await page.click('button:has-text("+")');
    await expect(page.locator('span.w-4')).toHaveText('2');

    // Decrement quantity
    await page.click('button:has-text("-")');
    await expect(page.locator('span.w-4')).toHaveText('1');

    // Remove item
    await page.click('button:has-text("Remove")');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });
});
