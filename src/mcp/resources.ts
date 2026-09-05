import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCheckout } from "../lib/buyer/tools";

export function registerResources(server: McpServer) {
  // Register an MCP Apps UI resource for interactive checkout.
  // This satisfies the requirement: _meta.ui.resourceUri = ui://marketplace/checkout
  
  server.registerResource(
    "Interactive Checkout UI",
    new ResourceTemplate("ui://marketplace/checkout/{domain}/{checkoutId}", { list: undefined }),
    {
      description: "Provides an interactive UI for completing a marketplace checkout session",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      const domain = String(variables.domain);
      const checkoutId = String(variables.checkoutId);

      const checkoutData = await getCheckout(domain, checkoutId);

      // We provide a structured JSON fallback representing the UI state.
      // A capable MCP client would use this URI to render a rich React component.
      const uiRepresentation = {
        _meta: {
          ui: {
            resourceUri: uri.href,
            component: "CheckoutModal"
          }
        },
        state: {
          checkout: checkoutData,
          actions: {
            complete: "complete_checkout",
            negotiate: "negotiate_discount"
          }
        },
        fallbackText: `Checkout Summary for ${checkoutId}:
Status: ${checkoutData.status}
Total: ${checkoutData.currency} ${(checkoutData.amount / 100).toFixed(2)}
Please use the 'complete_checkout' tool to finalize your payment.`
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(uiRepresentation, null, 2)
        }]
      };
    }
  );
}
