import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Setup environment and paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

// Config
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "my-secret-key-123";
const WEB_MODE = process.env.WEB_MODE === "true";

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAbYwOAlJmAXwNhnse2XKwCALhdhRaUlYY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "plotview-f5eec.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "plotview-f5eec",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "plotview-f5eec.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "173508011029",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:173508011029:web:ff70ab7bbd7875df12da1c"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);
const auth = getAuth(appInstance);

// Authenticate Admin automatically
signInWithEmailAndPassword(auth, "nahushpatel880@gmail.com", "Admin@2026@")
  .then(() => console.error("✅ Firebase Authenticated as Admin successfully."))
  .catch((err) => console.error("❌ Firebase Auth Error:", err.message));

// ----------------------------------------------------
// MCP SERVER LOGIC
// ----------------------------------------------------
const mcpServer = new Server(
  { name: "plotview-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "Returns a list of all Real Estate projects in the database.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_project",
      description: "Returns full details for a specific project, including all its plots.",
      inputSchema: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"],
      },
    },
    {
      name: "create_project",
      description: "Creates a new real estate project.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          clientName: { type: "string" }
        },
        required: ["name"],
      },
    },
    {
      name: "add_plot",
      description: "Adds a single plot to an existing project.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          name: { type: "string" },
          area: { type: "number" },
          size: { type: "string" },
          type: { type: "string" },
          status: { type: "string" },
          facing: { type: "string" }
        },
        required: ["projectId", "name"],
      },
    },
    {
      name: "update_plot_status",
      description: "Updates the status of a specific plot.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          plotId: { type: "string" },
          newStatus: { type: "string" }
        },
        required: ["projectId", "plotId", "newStatus"],
      },
    }
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!db) throw new Error("Database not initialized.");
  try {
    switch (request.params.name) {
      case "list_projects": {
        const snapshot = await getDocs(collection(db, "projects"));
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
      }
      case "get_project": {
        const { projectId } = request.params.arguments;
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (!projectDoc.exists()) throw new Error("Not found");
        const projectData = projectDoc.data();
        const plotsSnapshot = await getDocs(collection(db, `projects/${projectId}/plots`));
        projectData.plots = plotsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { content: [{ type: "text", text: JSON.stringify(projectData, null, 2) }] };
      }
      case "create_project": {
        const { name, clientName } = request.params.arguments;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newProject = { name, clientName: clientName || "", slug, backgroundUrl: "", createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, "projects"), newProject);
        return { content: [{ type: "text", text: `Success! Project created with ID: ${docRef.id}` }] };
      }
      case "add_plot": {
        const { projectId, name, area, size, type, status, facing } = request.params.arguments;
        const plotId = uuidv4();
        const newPlot = { name, area: area || 0, size: size || "", type: type || "Plot", status: status || "Available", facing: facing || "East", points: "100,100 200,100 200,200 100,200" };
        await setDoc(doc(db, `projects/${projectId}/plots`, plotId), newPlot);
        return { content: [{ type: "text", text: `Success: ${JSON.stringify({id: plotId, ...newPlot})}` }] };
      }
      case "update_plot_status": {
        const { projectId, plotId, newStatus } = request.params.arguments;
        await updateDoc(doc(db, `projects/${projectId}/plots`, plotId), { status: newStatus });
        return { content: [{ type: "text", text: `Status updated to ${newStatus}` }] };
      }
      default: throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
});

// ----------------------------------------------------
// STARTUP LOGIC
// ----------------------------------------------------

if (WEB_MODE) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const authenticateKey = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if ((authHeader && authHeader === `Bearer ${API_KEY}`) || req.query.api_key === API_KEY) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
  };

  let transport;
  app.get("/sse", async (req, res) => {
    if (req.query.api_key !== API_KEY) return res.status(401).send("Unauthorized");
    transport = new SSEServerTransport("/message?api_key=" + API_KEY, res);
    await mcpServer.connect(transport);
  });

  app.post("/message", async (req, res) => {
    if (req.query.api_key !== API_KEY) return res.status(401).send("Unauthorized");
    if (transport) await transport.handlePostMessage(req, res);
    else res.status(500).send("Not initialized");
  });

  app.listen(PORT, () => {
    console.error(`🚀 WEB MODE: API Server running on port ${PORT}`);
  });
} else {
  const runLocal = async () => {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("🚀 STDIO MODE: PlotView MCP Server running on stdio");
  };
  runLocal().catch(console.error);
}
