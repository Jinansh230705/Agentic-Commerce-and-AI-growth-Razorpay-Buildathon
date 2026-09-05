# Aster Gear

Aster Gear is a direct-to-consumer retailer specializing in running equipment and accessories.

## Products

We sell:
- Running shoes
- Running apparel
- Backpacks
- Water bottles
- Running accessories

## Product Discovery

Products can be searched through:

GET /api/products/search?q=<query>

Product details:

GET /api/products/:id

Full catalog:

GET /api/products

## Important

Prices are denominated in INR (smallest unit: paise for Razorpay, raw integer for catalog).

Inventory should be checked before assuming an item is available.

## Machine Interfaces

UCP profile:
GET /.well-known/ucp

Product API:
GET /api/products

Checkout:
POST /api/checkout

Checkout supports AP2 capability negotiation. Include `capabilities: ["ap2"]` in the checkout request body to receive a merchant authorization (detached JWS).

## AI Commerce Discovery

This merchant is registered in the AI Commerce Discovery Registry.

Registry search:
GET /api/registry/search?category=<category>&capability=<capability>
