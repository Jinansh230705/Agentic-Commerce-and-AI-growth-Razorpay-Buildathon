import { test, expect } from '@playwright/test';

test.describe('Product API', () => {
  test('GET /api/products returns paginated catalog', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Validate semantic structure
    expect(data.pagination).toBeDefined();
    expect(typeof data.pagination.page).toBe('number');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('GET /api/products/search filters dynamically based on existing products', async ({ request }) => {
    // 1. Fetch a product dynamically
    const catalogResponse = await request.get('/api/products');
    const catalog = await catalogResponse.json();
    expect(catalog.items.length).toBeGreaterThan(0);
    
    const sampleProduct = catalog.items[0];
    
    // 2. Search for the exact name
    const searchResponse = await request.get(`/api/products/search?q=${encodeURIComponent(sampleProduct.name)}`);
    expect(searchResponse.ok()).toBeTruthy();
    
    const searchData = await searchResponse.json();
    expect(searchData.items.length).toBeGreaterThan(0);
    expect(searchData.items.some((item: any) => item.name === sampleProduct.name)).toBeTruthy();
  });

  test('GET /api/products/search handles empty results for gibberish query', async ({ request }) => {
    const response = await request.get('/api/products/search?q=XYZ123NONEXISTENT_GIBBERISH');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.items.length).toBe(0);
  });

  test('GET /api/products/[id] returns 404 and structured error for invalid ID', async ({ request }) => {
    const response = await request.get('/api/products/invalid_uuid_123');
    expect(response.status()).toBe(404);
    
    const errorData = await response.json();
    expect(errorData.error).toBeDefined();
    expect(errorData.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('GET /api/categories returns valid categories', async ({ request }) => {
    const response = await request.get('/api/categories');
    expect(response.ok()).toBeTruthy();
    const categories = await response.json();
    expect(Array.isArray(categories.categories)).toBeTruthy();
  });
});
