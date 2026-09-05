/**
 * Phase 2: Prototype AI Commerce Discovery Registry
 * 
 * This is a standalone, lightweight registry designed to help AI agents discover
 * merchants that support machine-readable commerce profiles (UCP).
 * 
 * How it works:
 * 1. The registry maintains a list of known merchant domains.
 * 2. AI agents query the registry for merchants matching certain categories.
 * 3. The registry returns the merchant domain.
 * 4. The AI agent navigates directly to the merchant's `/.well-known/ucp` to discover products.
 * 
 * Aster Gear remains the single source of truth for its own data. This registry
 * only holds pointers (domains).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

const merchantsIndex = [
  {
    id: 'mrc_aster_gear',
    domain: 'http://localhost:3000',
    categories: ['Running Shoes', 'Backpacks', 'Water Bottles', 'Apparel', 'Accessories']
  },
  {
    id: 'mrc_omega_sports',
    domain: 'http://localhost:3000',
    categories: ['Apparel', 'Accessories', 'Training']
  }
];

const server = http.createServer((req, res) => {
  // CORS headers for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url.startsWith('/api/discover')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const categoryQuery = url.searchParams.get('category');
    
    let results = merchantsIndex;
    
    if (categoryQuery) {
      results = merchantsIndex.filter(m => 
        m.categories.some(c => c.toLowerCase().includes(categoryQuery.toLowerCase()))
      );
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      version: '0.1.0',
      description: 'AI Commerce Discovery Registry Prototype',
      merchants: results.map(m => ({
        id: m.id,
        ucpEndpoint: `${m.domain}/.well-known/ucp`,
        categories: m.categories
      }))
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Phase 2 Discovery Registry running on port ${PORT}`);
  console.log(`Test: curl http://localhost:${PORT}/api/discover?category=Running`);
});
