import { PrismaClient } from '@prisma/registry-client'
import { URL } from 'url'
import dns from 'dns'
import util from 'util'

const lookup = util.promisify(dns.lookup)

// We create a singleton instance of the registry Prisma client
const globalForPrisma = global as unknown as { registryPrisma: PrismaClient }
export const registryPrisma = globalForPrisma.registryPrisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.registryPrisma = registryPrisma

/**
 * Checks if an IP is a private, loopback, or cloud metadata address.
 */
function isDisallowedIP(ip: string): boolean {
  // Allow localhost specifically for test/development environments as per the implementation plan
  if (ip === '127.0.0.1' || ip === '::1') {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === '1') {
      return false // Bypass for local testing
    }
    return true
  }

  // 10.0.0.0/8
  if (ip.startsWith('10.')) return true
  
  // 172.16.0.0/12
  if (ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return true
  
  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true
  
  // 169.254.0.0/16 (Link-local & AWS Metadata)
  if (ip.startsWith('169.254.')) return true
  
  // 0.0.0.0/8
  if (ip.startsWith('0.')) return true

  // IPv6 Private / Loopback checks (simplified)
  if (ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:') || ip.toLowerCase().startsWith('fe80:')) return true

  return false
}

/**
 * SSRF-Safe Fetch:
 * - Enforces http/https
 * - Resolves DNS and blocks private IPs
 * - Controls redirects and sizes
 */
async function safeFetch(targetUrl: string, maxRedirects = 3): Promise<Response> {
  let currentUrl = targetUrl
  let redirects = 0

  while (redirects <= maxRedirects) {
    const parsed = new URL(currentUrl)
    
    // 1. Strict Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`)
    }

    // 2. DNS Resolution and SSRF IP check
    const { address } = await lookup(parsed.hostname)
    if (isDisallowedIP(address)) {
      throw new Error(`SSRF blocked: Attempted access to prohibited IP ${address}`)
    }

    // 3. Fetch with manual redirect and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AsterGear-Prober/1.0'
        },
        redirect: 'manual', // Intercept redirects for SSRF check
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle redirect
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!
        currentUrl = new URL(location, currentUrl).toString()
        redirects++
        continue
      }

      // Check content-length header if provided, to avoid huge payloads
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) { // 1MB limit
        throw new Error('Response too large')
      }

      return response
    } catch (e) {
      clearTimeout(timeoutId)
      throw e
    }
  }

  throw new Error('Too many redirects')
}

export async function probeMerchant(merchantId: string, domain: string) {
  try {
    const ucpUrl = new URL('/.well-known/ucp', domain).toString()
    const res = await safeFetch(ucpUrl)

    if (!res.ok) {
      await markMerchantInactive(merchantId)
      return { success: false, reason: `UCP returned status ${res.status}` }
    }

    // Validate size during read
    const text = await res.text()
    if (text.length > 1024 * 1024) throw new Error('UCP file too large')

    let ucp
    try {
      ucp = JSON.parse(text)
    } catch {
      await markMerchantInactive(merchantId)
      return { success: false, reason: 'Invalid JSON' }
    }

    // Strict Schema Validation
    if (ucp.ucp_version !== '1.0' || !ucp.business || typeof ucp.business.name !== 'string' || !Array.isArray(ucp.capabilities)) {
      await markMerchantInactive(merchantId)
      return { success: false, reason: 'Invalid UCP profile schema' }
    }

    await registryPrisma.registeredMerchant.update({
      where: { id: merchantId },
      data: {
        name: ucp.business.name,
        description: typeof ucp.business.description === 'string' ? ucp.business.description : null,
        status: 'ACTIVE',
        lastVerifiedAt: new Date()
      }
    })

    const verificationPromises = ucp.capabilities.map(async (cap: any) => {
      let verificationStatus = 'UNAVAILABLE'
      try {
        if (!cap.endpoint || typeof cap.endpoint !== 'string') throw new Error('Invalid endpoint')
        
        const endpointUrl = new URL(cap.endpoint, domain).toString()
        const capRes = await safeFetch(endpointUrl)

        if (capRes.ok) {
          verificationStatus = 'VERIFIED'
        }
      } catch (e) {
        verificationStatus = 'UNAVAILABLE'
      }

      // Upsert to prevent race conditions during concurrent probes
      return registryPrisma.merchantCapability.upsert({
        where: {
          merchantId_capabilityType: {
            merchantId,
            capabilityType: String(cap.type)
          }
        },
        update: {
          endpoint: String(cap.endpoint),
          verificationStatus,
          lastVerifiedAt: new Date()
        },
        create: {
          merchantId,
          capabilityType: String(cap.type),
          endpoint: String(cap.endpoint),
          verificationStatus,
          lastVerifiedAt: new Date()
        }
      })
    })

    await Promise.allSettled(verificationPromises)
    
    return { success: true }
  } catch (error) {
    console.error(`Prober error for ${domain}:`, error)
    await markMerchantInactive(merchantId)
    return { success: false, reason: error instanceof Error ? error.message : 'Network error or timeout' }
  }
}

async function markMerchantInactive(merchantId: string) {
  await registryPrisma.registeredMerchant.update({
    where: { id: merchantId },
    data: {
      status: 'INACTIVE',
      lastVerifiedAt: new Date()
    }
  })
}
