import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["index.js"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const toolsResponse = await client.listTools();
  console.log("Tools found:", toolsResponse.tools.map(t => t.name).join(", "));

  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
