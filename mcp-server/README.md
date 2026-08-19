# PlotView Web API & MCP Server

This server allows any external AI (ChatGPT, Claude, Cursor) to manage your PlotView real estate projects. It exposes both standard REST API endpoints (for ChatGPT) and an MCP Server via SSE (for Claude and Cursor).

## 🚀 How to Deploy to the Web

Because AI clients need a public URL to talk to, you must host this folder on a web server. We recommend **Render.com** (it's free and easy).

1. Upload this `mcp-server` folder to a GitHub repository (or use your existing one).
2. Go to [Render.com](https://render.com/) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Set the Root Directory to `mcp-server`.
5. Set the Build Command to `npm install`.
6. Set the Start Command to `node server.js`.
7. **Important**: In Render's Environment Variables, add:
   - `API_KEY` = (create a secret password here, e.g., `my-super-secret-key-99`)
   - Wait, since `serviceAccountKey.json` is ignored in Git (for security), you must either upload it as a "Secret File" in Render, OR base64 encode it into an environment variable. 
     - *Alternative*: Render has a "Secret Files" section. Create a secret file named `serviceAccountKey.json` and paste the exact contents of your Firebase key into it.

8. Deploy the service! You will get a URL like `https://plotview-api.onrender.com`.

---

## 🤖 Connecting to ChatGPT

1. Go to ChatGPT and click **Explore GPTs** -> **Create**.
2. Go to the **Configure** tab.
3. Scroll down and click **Create new action**.
4. In the **Schema** box, paste the contents of the `openapi.yaml` file located in this folder.
   - *Note: Remember to replace `https://your-render-url.onrender.com` in the YAML file with your actual Render URL before pasting!*
5. Click the **Authentication** gear icon.
   - Select **API Key**.
   - Auth Type: **Bearer**
   - Paste the `API_KEY` you created in Render.
6. Save your Custom GPT. You can now chat with your database!

---

## 🤖 Connecting to Claude / Cursor (Remote MCP)

If you are running the server locally, you can use the Stdio configuration. But if you deployed it to Render, you can connect to it remotely via SSE.

**Note:** As of right now, Claude Desktop only supports local `stdio` via the config file. To use an SSE endpoint, you would need an MCP client that supports SSE transport (like some custom Cursor setups or Windsurf).

For local usage in Claude Desktop, edit your config:
```json
{
  "mcpServers": {
    "plotview": {
      "command": "node",
      "args": [
        "C:\\Users\\Nahush Patel\\Desktop\\Real Estate Brochure\\mcp-server\\server.js"
      ]
    }
  }
}
```
