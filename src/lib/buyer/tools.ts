import { prisma } from '../prisma'

export async function searchMerchants(query: string) {
  try {
    const res = await fetch(`http://localhost:3001/api/discover?category=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error('Registry search failed')
    const data = await res.json()
    // Data format: { merchants: [{ id, ucpEndpoint, categories }] }
    // We map this to { merchantId, domain } so we can extract the domain
    return (data.merchants || []).map((m: any) => {
      const url = new URL(m.ucpEndpoint)
      // In development, map domains to localhost to ensure API calls succeed
      const domain = process.env.NODE_ENV === 'development' ? 'localhost:3000' : url.host;
      return { merchantId: m.id, domain }
    })
  } catch (err) {
    console.error('Failed to query merchants:', err)
    return []
  }
}

export async function getMerchantProfile(domain: string) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/.well-known/ucp`)
    if (!res.ok) throw new Error('UCP profile fetch failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return null
  }
}

// 2. Catalog
export async function searchProducts(domain: string, query: string) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/products/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error('Product search failed')
    const data = await res.json()
    return data.items || []
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function getProduct(domain: string, productId: string) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/products/${productId}`)
    if (!res.ok) throw new Error('Get product failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return null
  }
}

// 3. Checkout
export async function createCheckout(domain: string, merchantId: string, items: Array<{productId: string, quantity: number}>) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, items, capabilities: ['ap2'] })
    })
    if (!res.ok) throw new Error('Create checkout failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return { error: 'Failed to create checkout' }
  }
}

export async function getCheckout(domain: string, checkoutId: string) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/checkout/${checkoutId}`)
    if (!res.ok) throw new Error('Get checkout failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return { error: 'Failed to get checkout' }
  }
}

export async function updateCheckout(domain: string, checkoutId: string, payload: any) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/checkout/${checkoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Update checkout failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return { error: 'Failed to update checkout' }
  }
}

export async function completeCheckout(domain: string, checkoutId: string, mandateId?: string) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/checkout/${checkoutId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'ap2.checkout_mandate': mandateId })
    })
    if (!res.ok) throw new Error('Complete checkout failed')
    return await res.json()
  } catch (err) {
    console.error(err)
    return { error: 'Failed to complete checkout' }
  }
}

// 4. Negotiation
export async function negotiateDiscount(domain: string, checkoutId: string, requestedDiscountPercent: number) {
  const baseUrl = domain.includes('http') ? domain : `http://${domain}`
  try {
    const res = await fetch(`${baseUrl}/api/checkout/${checkoutId}/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedDiscountPercent })
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      return { error: errData?.error || 'Negotiation failed' }
    }
    return await res.json()
  } catch (err) {
    console.error(err)
    return { error: 'Failed to negotiate discount' }
  }
}

// 5. Audit Log
export async function logAuditEvent(agentId: string, action: string, details: any, merchantId?: string, checkoutId?: string, result?: string, reason?: string) {
  return await prisma.auditLog.create({
    data: {
      agentId,
      action,
      merchantId,
      checkoutId,
      details: JSON.stringify(details),
      result,
      reason
    }
  })
}
