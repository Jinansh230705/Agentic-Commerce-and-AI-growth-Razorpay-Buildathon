import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
  searchMerchants, 
  getMerchantProfile, 
  searchProducts, 
  getProduct, 
  createCheckout, 
  updateCheckout, 
  getCheckout,
  completeCheckout, 
  negotiateDiscount 
} from "../lib/buyer/tools";

export function registerTools(server: McpServer) {
  // 1. Search Merchants
  server.registerTool(
    "search_merchants",
    {
      title: "Search Merchants",
      description: "Search for merchants in the registry by category or keyword.",
      inputSchema: z.object({
        query: z.string().describe("Search keyword or category")
      })
    },
    async ({ query }) => {
      const data = await searchMerchants(query);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 2. Get Merchant Profile
  server.registerTool(
    "get_merchant_profile",
    {
      title: "Get Merchant Profile",
      description: "Fetch a merchant's Unified Commerce Profile (UCP) to understand their capabilities.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain")
      })
    },
    async ({ domain }) => {
      const data = await getMerchantProfile(domain);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 3. Search Products
  server.registerTool(
    "search_products",
    {
      title: "Search Products",
      description: "Search for products from a specific merchant.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        query: z.string().describe("Product search query")
      })
    },
    async ({ domain, query }) => {
      const data = await searchProducts(domain, query);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 4. Get Product
  server.registerTool(
    "get_product",
    {
      title: "Get Product Details",
      description: "Get detailed information about a specific product.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        productId: z.string().describe("The ID of the product")
      })
    },
    async ({ domain, productId }) => {
      const data = await getProduct(domain, productId);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 5. Create Checkout
  server.registerTool(
    "create_checkout",
    {
      title: "Create Checkout",
      description: "Initialize a new checkout session with products.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        merchantId: z.string().describe("The merchant's ID"),
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number().int().min(1)
        })).describe("List of items to purchase")
      })
    },
    async ({ domain, merchantId, items }) => {
      const data = await createCheckout(domain, merchantId, items);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 6. Get Checkout
  server.registerTool(
    "get_checkout",
    {
      title: "Get Checkout",
      description: "Retrieve the current state of a checkout session.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        checkoutId: z.string().describe("The checkout session ID")
      })
    },
    async ({ domain, checkoutId }) => {
      const data = await getCheckout(domain, checkoutId);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 7. Update Checkout
  server.registerTool(
    "update_checkout",
    {
      title: "Update Checkout",
      description: "Update checkout information like shipping address.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        checkoutId: z.string().describe("The checkout session ID"),
        payload: z.object({
          shippingAddress: z.any().optional(),
          buyerInfo: z.any().optional()
        }).describe("Updates to apply")
      })
    },
    async ({ domain, checkoutId, payload }) => {
      const data = await updateCheckout(domain, checkoutId, payload);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 8. Complete Checkout
  server.registerTool(
    "complete_checkout",
    {
      title: "Complete Checkout",
      description: "Complete the checkout session to create a payment order.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        checkoutId: z.string().describe("The checkout session ID"),
        mandateId: z.string().optional().describe("Optional AP2 mandate ID")
      })
    },
    async ({ domain, checkoutId, mandateId }) => {
      const data = await completeCheckout(domain, checkoutId, mandateId);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );

  // 9. Negotiate Discount
  server.registerTool(
    "negotiate_discount",
    {
      title: "Negotiate Discount",
      description: "Attempt to negotiate a better price for an active checkout session based on merchant policies.",
      inputSchema: z.object({
        domain: z.string().describe("The merchant's domain"),
        checkoutId: z.string().describe("The checkout session ID"),
        requestedDiscountPercent: z.number().min(0).max(100).describe("The discount percentage requested")
      })
    },
    async ({ domain, checkoutId, requestedDiscountPercent }) => {
      const data = await negotiateDiscount(domain, checkoutId, requestedDiscountPercent);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data
      };
    }
  );
}
