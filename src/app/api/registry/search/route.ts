import { NextRequest, NextResponse } from 'next/server'
import { registryPrisma } from '@/lib/registry/prober'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const capability = url.searchParams.get('capability')

    // Find all ACTIVE merchants that have the required capabilities
    let whereClause: any = {
      status: 'ACTIVE',
      capabilities: {
        some: {
          verificationStatus: 'VERIFIED'
        }
      }
    }

    if (capability) {
      whereClause.capabilities.some.capabilityType = capability
    }

    const merchants = await registryPrisma.registeredMerchant.findMany({
      where: whereClause,
      include: {
        capabilities: {
          where: {
            verificationStatus: 'VERIFIED'
          }
        }
      }
    })

    // Filter further by category if provided, since categories are stored as a JSON string or simple text match
    let filteredMerchants = merchants
    if (category) {
      filteredMerchants = merchants.filter((m: any) => {
        if (!m.categories) return false
        try {
          const cats = JSON.parse(m.categories)
          return Array.isArray(cats) && cats.some(c => c.toLowerCase().includes(category.toLowerCase()))
        } catch {
          // fallback string match
          return m.categories.toLowerCase().includes(category.toLowerCase())
        }
      })
    }

    // Format response for agents
    const response = {
      version: '1.0',
      description: 'Aster Gear Phase 2 AI Commerce Discovery Registry',
      results: filteredMerchants.map((m: any) => ({
        id: m.id,
        domain: m.domain,
        name: m.name,
        description: m.description,
        ucpEndpoint: `${m.domain}/.well-known/ucp`,
        verifiedCapabilities: m.capabilities.map((c: any) => ({
          type: c.capabilityType,
          endpoint: c.endpoint,
          verifiedAt: c.lastVerifiedAt
        }))
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
