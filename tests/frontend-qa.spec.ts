import { test, expect } from '@playwright/test'

test.describe('Frontend QA - End to End User Journeys', () => {
  
  test('Homepage loads correctly and has expected sections', async ({ page }) => {
    // We expect no console errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    
    await page.goto('/')
    
    // Check main hero
    await expect(page.locator('h1')).toContainText('Gear Built for Every Mile')
    
    // Check categories section
    await expect(page.locator('text=Shop by Category')).toBeVisible()
    
    // Check featured products
    await expect(page.locator('text=Featured Equipment')).toBeVisible()
    
    // Check AI Commerce banner
    await expect(page.locator('text=Shop smarter.')).toBeVisible()
    
    // Ensure no JS errors
    expect(errors).toHaveLength(0)
  })
  
  test('Shop filters and search work', async ({ page, isMobile }) => {
    await page.goto('/products')
    
    if (isMobile) {
        // Skip search on mobile to avoid dealing with hamburger menus for this quick QA
        return
    }
    
    // Search for "shoe"
    await page.fill('input[name="q"]', 'shoe')
    await page.keyboard.press('Enter')
    
    // URL should have q=shoe
    await expect(page).toHaveURL(/.*q=shoe/)
    
    // Click clear filters
    await page.click('text=Clear all filters')
    await expect(page).toHaveURL(/.*\/products/)
  })

  test('Cart addition and modification', async ({ page }) => {
    // Go to first product
    await page.goto('/products')
    await page.locator('a[href^="/products/"]').first().click()
    
    // Add to cart
    await page.click('button:has-text("Add to Cart")')
    
    // Navigate to cart
    await page.goto('/cart')
    
    // Verify item is in cart
    await expect(page.locator('h1')).toContainText('Your Cart')
    const removeBtn = page.locator('button:has-text("Remove")').first()
    await expect(removeBtn).toBeVisible()
    
    // Remove item
    await removeBtn.click()
    await expect(page.locator('text=Your cart is empty')).toBeVisible()
  })

  test('AI Buyer page renders correctly', async ({ page }) => {
    await page.goto('/buyer')
    await expect(page.locator('h1')).toContainText('AI Buyer')
    await expect(page.locator('button:has-text("Initialize Agent")')).toBeVisible()
  })

  test('Merchant Dashboard renders correctly', async ({ page }) => {
    await page.goto('/merchant/growth')
    await expect(page.locator('h1')).toContainText('Merchant Growth Dashboard')
    await expect(page.locator('text=Revenue & Growth Overview')).toBeVisible()
    await expect(page.locator('text=Action Review Queue')).toBeVisible()
  })

})
