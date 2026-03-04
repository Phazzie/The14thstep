import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_PATH = path.join(__dirname, "index.js");

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    console.log("Tools found:", toolsResponse.tools.map((tool) => tool.name).join(", "));
  } finally {
    if (typeof client.close === "function") {
      await client.close();
    }
  }
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
