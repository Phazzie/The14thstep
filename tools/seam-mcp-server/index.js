import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../");
const CLI_PATH = path.join(REPO_ROOT, "tools/seam-cli/index.js");
const REGISTRY_PATH = path.join(REPO_ROOT, "seam-registry.json");

const server = new Server(
  {
    name: "seam-driven-development-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_seam_registry",
      description: "Returns the parsed seam-registry.json which contains all IO seams in the project.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "check_seam_freshness",
      description: "Runs seam-cli freshness check to see if any fixture probes have expired.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "record_seam_probe",
      description: "Runs the probe for a seam to update its fixtures.",
      inputSchema: {
        type: "object",
        properties: {
          seamId: { type: "string", description: "The ID of the seam to record." },
        },
        required: ["seamId"],
      },
    },
    {
      name: "automock_seam",
      description: "Generates a mock representation of the seam based on recorded fixtures.",
      inputSchema: {
        type: "object",
        properties: {
          seamId: { type: "string", description: "The ID of the seam to automock." },
        },
        required: ["seamId"],
      },
    }
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_seam_registry") {
    try {
      const registry = fs.readFileSync(REGISTRY_PATH, "utf8");
      return { content: [{ type: "text", text: registry }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error reading registry: ${e.message}` }], isError: true };
    }
  }

  if (request.params.name === "check_seam_freshness") {
    try {
      const output = execSync(`node ${CLI_PATH} freshness`, { encoding: "utf8" });
      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      // execSync throws if exit code is non-zero (which freshness does on stale)
      return { content: [{ type: "text", text: e.stdout + "\n" + e.stderr }], isError: true };
    }
  }

  if (request.params.name === "record_seam_probe") {
    const { seamId } = request.params.arguments;
    try {
      const output = execSync(`node ${CLI_PATH} record ${seamId}`, { encoding: "utf8" });
      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return { content: [{ type: "text", text: e.stdout + "\n" + e.stderr }], isError: true };
    }
  }

  if (request.params.name === "automock_seam") {
    const { seamId } = request.params.arguments;
    try {
      const output = execSync(`node ${CLI_PATH} automock ${seamId}`, { encoding: "utf8" });
      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return { content: [{ type: "text", text: e.stdout + "\n" + e.stderr }], isError: true };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
