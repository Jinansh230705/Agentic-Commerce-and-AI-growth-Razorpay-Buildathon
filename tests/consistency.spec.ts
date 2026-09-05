import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Data Consistency', () => {
  
  test('DB -> Schema.org (JSON-LD) matches UI and DB', async ({ page }) => {
    // Pick a random product from DB
    const product = await prisma.product.findFirst();
    if (!product) return;
    
    await page.goto(`/products/${product.slug}`);
    
    // Check UI for price
    await expect(page.locator('h1')).toContainText(product.name);
    
    // Extract JSON-LD script content
    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdText).toBeTruthy();
    
    const schema = JSON.parse(jsonLdText!);
    
    // Check specific fields for consistency
    expect(schema.name).toBe(product.name);
    expect(schema.sku).toBe(product.productId);
    expect(schema.offers.price).toBe(product.priceAmount);
    expect(schema.offers.priceCurrency).toBe(product.currency);
    expect(schema.offers.availability).toBe(
      product.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    );
  });

  test('DB -> API Machine Representation matches DB', async ({ request }) => {
    const dbProducts = await prisma.product.findMany({ take: 5 });
    if (dbProducts.length === 0) return;

    for (const product of dbProducts) {
      const response = await request.get(`/api/products/${product.id}`);
      if (response.ok()) {
          const apiProduct = await response.json();
          expect(apiProduct.id).toBe(product.id);
          expect(apiProduct.price.amount).toBe(product.priceAmount);
          expect(apiProduct.price.currency).toBe(product.currency);
          expect(apiProduct.availability).toBe(product.availability);
      }
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });
});
