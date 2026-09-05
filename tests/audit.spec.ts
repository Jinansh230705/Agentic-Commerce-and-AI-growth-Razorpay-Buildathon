import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

test.describe('Audit Trail', () => {
  test('High-risk actions generate an audit trail', async ({ request }) => {
    const chatRes = await request.post('/api/buyer/chat', {
      data: { query: 'Find me road running shoes' }
    })
    
    expect(chatRes.ok()).toBeTruthy()
    const data = await chatRes.json()
    const agentId = data.agentId
    
    // Verify Audit records exist for this agent session
    const logs = await prisma.auditLog.findMany({
      where: { agentId },
      orderBy: { timestamp: 'asc' }
    })
    const actions = logs.map((l: any) => l.action)

    // Expected trail for a successful discovery and checkout initialization
    expect(actions).toContain('DISCOVERY_SEARCH')
    expect(actions).toContain('MERCHANT_SELECTED')
    expect(actions).toContain('UCP_PROFILE_FETCHED')
    expect(actions).toContain('PRODUCT_SEARCH')
    expect(actions).toContain('PRODUCT_SELECTED')
    expect(actions).toContain('CHECKOUT_CREATED')
    expect(actions).toContain('CHECKOUT_UPDATED')
    expect(actions).toContain('CONFIRMATION_REQUESTED')
  })
})
