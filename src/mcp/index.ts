import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools";
import { registerResources } from "./resources";

// Create MCP server instance
const server = new McpServer({
  name: "marketplace-mcp-server",
  version: "1.0.0"
});

// Register tools and resources
registerTools(server);
registerResources(server);

// Main function
async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Marketplace MCP server running via stdio");
}

runStdio().catch(error => {
  console.error("Server error:", error);
  process.exit(1);
});
