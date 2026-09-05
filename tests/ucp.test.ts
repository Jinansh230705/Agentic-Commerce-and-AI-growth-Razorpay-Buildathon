// test/ucp.test.ts
// Run this test with: npx tsx test/ucp.test.ts
// Ensure the development server is running (npm run dev) on port 3000 before running.

async function runTests() {
  console.log('UCP VALIDATION\n')
  let passed = true

  try {
    const res = await fetch('http://localhost:3000/.well-known/ucp')
    
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
    }
    console.log('✓ HTTP Request Success')

    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`✗ Invalid Content-Type: ${contentType}`)
      passed = false
    } else {
      console.log('✓ Content-Type is application/json')
    }

    const data = await res.json()
    console.log('✓ Valid JSON')

    // Basic structure validation
    if (data.ucp_version !== '1.0') {
      console.error(`✗ Invalid ucp_version: ${data.ucp_version}`)
      passed = false
    } else {
      console.log(`✓ Version: ${data.ucp_version}`)
    }

    if (!data.business || !data.business.id || !data.business.name || !data.business.domain) {
      console.error('✗ Missing required business profile fields (id, name, domain)')
      passed = false
    } else {
      console.log('✓ Valid business structure')
    }

    if (!Array.isArray(data.capabilities)) {
      console.error('✗ capabilities must be an array')
      passed = false
    } else {
      console.log('✓ Declared capabilities valid')
    }

    if (!Array.isArray(data.services)) {
      console.error('✗ services must be an array')
      passed = false
    } else {
      console.log('✓ Declared services valid')
    }

    // Check application capabilities correspond to declared ones
    const productDiscovery = data.capabilities.find((c: any) => c.type === 'product_discovery')
    if (!productDiscovery || !productDiscovery.endpoint) {
      console.error('✗ Missing product_discovery capability or endpoint')
      passed = false
    } else {
      console.log('✓ product_discovery capability correctly declared')
    }

    // Ensure no nonexistent capabilities are advertised
    const allowedCapabilities = ['product_discovery', 'payments', 'negotiation', 'checkout'] // Based on UCP spec phase
    const unknownCapabilities = data.capabilities.filter((c: any) => !allowedCapabilities.includes(c.type))
    if (unknownCapabilities.length > 0) {
      console.error(`✗ Unknown capabilities advertised: ${unknownCapabilities.map((c: any) => c.type).join(', ')}`)
      passed = false
    }

  } catch (error) {
    console.error('Test Failed:', error)
    passed = false
  }

  console.log(`\nResult: ${passed ? 'PASS' : 'FAIL'}`)
  if (!passed) {
    process.exit(1)
  }
}

runTests()
