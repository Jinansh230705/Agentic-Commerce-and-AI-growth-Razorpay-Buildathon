import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Machine Interfaces', () => {

  test('UCP profile complies with schema and version 1.0', async ({ request }) => {
    // Dynamically retrieve the merchant from the DB to avoid hardcoded IDs
    const dbMerchant = await prisma.merchant.findFirst();
    expect(dbMerchant).toBeDefined();

    const response = await request.get('/.well-known/ucp');
    expect(response.ok()).toBeTruthy();
    const ucp = await response.json();
    
    // Strict UCP version 1.0 check
    expect(ucp.ucp_version).toBe('1.0');
    
    // Strict Business Profile check
    expect(ucp.business).toBeDefined();
    expect(ucp.business.id).toBe(dbMerchant!.merchantId);
    expect(ucp.business.name).toBe(dbMerchant!.name);
    
    // Validate capabilities structure
    expect(Array.isArray(ucp.capabilities)).toBeTruthy();
    const hasProductDiscovery = ucp.capabilities.some((c: any) => 
      c.type === 'product_discovery' && c.endpoint === '/api/products'
    );
    expect(hasProductDiscovery).toBeTruthy();
  });

  test('agents.md is discoverable and provides correct structured context', async ({ request }) => {
    const response = await request.get('/agents.md');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    
    // Parse the markdown conceptually to ensure semantic endpoints are exposed
    // It should declare the UCP profile and Product API endpoints
    const ucpMatch = text.match(/GET\s+(\/\.well-known\/ucp)/);
    const apiMatch = text.match(/GET\s+(\/api\/products)/);
    
    expect(ucpMatch).not.toBeNull();
    expect(apiMatch).not.toBeNull();
    
    if (ucpMatch) {
      expect(ucpMatch[1]).toBe('/.well-known/ucp');
    }
  });

  test('robots.txt and sitemap.xml are accessible', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });
});
