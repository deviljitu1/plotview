import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "mcp-server", "server.js");

// Spawn the MCP server with the correct working directory so it finds its local node_modules
const child = spawn("node", [serverPath], {
  cwd: join(__dirname, "mcp-server"),
  stdio: "inherit"
});
