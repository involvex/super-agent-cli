import { IncomingMessage, Server, ServerResponse, createServer } from "http";
import { SuperAgent } from "../agent/super-agent";
import { WebSocket, WebSocketServer } from "ws";
import * as fs from "fs-extra";
import * as path from "path";
import open from "open";
import mime from "mime";

export interface WebServerOptions {
  hostname?: string;
  port?: number;
  agent: SuperAgent;
  openBrowser?: boolean;
}

export class WebServer {
  private httpServer: Server;
  private wss: WebSocketServer;
  private agent: SuperAgent;
  private hostname: string;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor(options: WebServerOptions) {
    this.hostname = options.hostname || "localhost";
    this.port = options.port || 3000;
    this.agent = options.agent;

    // Create HTTP server
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on("connection", ws => {
      this.handleWebSocketConnection(ws);
    });
  }

  private async handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = req.url || "/";

    // Security: Normalize and validate the requested path
    // Remove leading slash for path joining
    let requestedPath = url === "/" ? "index.html" : url.substring(1);

    // Remove query strings and fragments
    const sanitizedPath = requestedPath.split("?")[0].split("#")[0];

    // Resolve to absolute path and ensure it's within the client directory
    // When bundled: __dirname = dist/, files are in dist/web
    // When from source: __dirname = src/web/, files are in src/web/client
    const distWebPath = path.join(process.cwd(), "dist", "web");
    const sourceWebPath = path.join(process.cwd(), "src", "web", "client");
    const clientDir = (await fs.pathExists(distWebPath))
      ? distWebPath
      : sourceWebPath;
    const absolutePath = path.resolve(clientDir, sanitizedPath);

    // Security check: ensure the resolved path is within the client directory
    // Normalize paths for comparison (handles Windows vs Unix path differences)
    const normalizedClientDir = path.resolve(clientDir);
    const normalizedAbsolutePath = path.resolve(absolutePath);
    if (!normalizedAbsolutePath.startsWith(normalizedClientDir)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    try {
      if (await fs.pathExists(absolutePath)) {
        const stat = await fs.stat(absolutePath);
        let filePath = absolutePath;

        if (stat.isDirectory()) {
          filePath = path.join(absolutePath, "index.html");
        }

        const content = await fs.readFile(filePath);
        const mimeType = mime.getType(filePath) || "application/octet-stream";

        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    } catch (error) {
      console.error("Error serving file:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  private handleWebSocketConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`📡 Web client connected (${this.clients.size} total)`);

    // Send update notification if available
    this.checkAndSendUpdateNotification(ws);

    ws.on("message", async data => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "prompt" || message.type === "chat_message") {
          const content = message.content?.message || message.content || "";
          await this.handlePrompt(content, ws);
        } else if (message.type === "get_file_tree") {
          await this.handleGetFileTree(ws);
        } else if (message.type === "get_file_content") {
          const filePath = message.path || message.filePath;
          await this.handleGetFileContent(filePath, ws);
        } else if (message.type === "list_sessions") {
          await this.handleListSessions(ws);
        } else if (message.type === "switch_session") {
          await this.handleSwitchSession(message.sessionId, ws);
        } else if (message.type === "get_chat_history") {
          await this.handleGetChatHistory(ws);
        } else if (message.type === "abort") {
          this.agent.abortCurrentOperation();
          ws.send(
            JSON.stringify({ type: "done", content: "Operation aborted" }),
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(
          JSON.stringify({ type: "error", content: "Invalid message format" }),
        );
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
      console.log(
        `📡 Web client disconnected (${this.clients.size} remaining)`,
      );
    });

    ws.on("error", error => {
      console.error("WebSocket error:", error);
    });
  }

  private async handlePrompt(prompt: string, ws: WebSocket): Promise<void> {
    try {
      // Send acknowledgment
      ws.send(JSON.stringify({ type: "user_message", content: prompt }));

      // Process the message (non-streaming for now)
      const entries = await this.agent.processUserMessage(prompt);

      // Send each entry back
      for (const entry of entries) {
        if (entry.type === "assistant") {
          ws.send(
            JSON.stringify({
              type: "assistant_message",
              content: entry.content,
            }),
          );
        } else if (entry.type === "tool_call") {
          ws.send(
            JSON.stringify({
              type: "tool_call",
              tool: entry.toolCall?.function.name,
              content: "Executing...",
            }),
          );
        } else if (entry.type === "tool_result") {
          ws.send(
            JSON.stringify({
              type: "tool_result",
              tool: entry.toolCall?.function.name,
              content: entry.content,
            }),
          );
        }
      }

      ws.send(JSON.stringify({ type: "done" }));
    } catch (error: any) {
      ws.send(
        JSON.stringify({
          type: "error",
          content: error.message,
        }),
      );
    }
  }

  private async handleGetFileTree(ws: WebSocket): Promise<void> {
    try {
      const { getFileIndexer } = await import("../indexing/indexer");
      const indexer = getFileIndexer();
      const index = indexer.getIndex();

      if (!index) {
        ws.send(JSON.stringify({ type: "file_tree", tree: [] }));
        return;
      }

      // Build simple tree structure from flat index
      const tree = index.entries
        .filter(
          e => !e.path.includes("node_modules") && !e.path.startsWith("."),
        )
        .map(e => ({
          path: e.path,
          name: path.basename(e.path),
          isDirectory: e.isDirectory,
          size: e.size,
        }))
        .slice(0, 500); // Limit to 500 items for performance

      ws.send(JSON.stringify({ type: "file_tree", tree }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", content: error.message }));
    }
  }

  private async handleGetFileContent(
    filePath: string,
    ws: WebSocket,
  ): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), filePath);

      // Security check: ensure path is within project
      if (!fullPath.startsWith(process.cwd())) {
        throw new Error("Access denied");
      }

      const content = await fs.readFile(fullPath, "utf-8");
      ws.send(
        JSON.stringify({
          type: "file_content",
          path: filePath,
          content: content.slice(0, 10000), // Limit to 10KB
        }),
      );
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", content: error.message }));
    }
  }

  private async handleListSessions(ws: WebSocket): Promise<void> {
    try {
      const { getSessionManager } = await import("../utils/session-manager");
      const sessionManager = getSessionManager();
      const sessions = await sessionManager.listSessions();

      ws.send(
        JSON.stringify({
          type: "sessions_list",
          sessions: sessions.map(s => ({
            id: s.id,
            name: s.name,
            workingDirectory: s.workingDirectory,
            messageCount: s.messages.length,
            lastAccessed: s.lastAccessed,
          })),
        }),
      );
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", content: error.message }));
    }
  }

  private async handleSwitchSession(
    sessionId: string,
    ws: WebSocket,
  ): Promise<void> {
    try {
      const { getSessionManager } = await import("../utils/session-manager");
      const sessionManager = getSessionManager();
      const session = await sessionManager.switchSession(sessionId);

      if (session) {
        ws.send(
          JSON.stringify({
            type: "session_switched",
            session: {
              id: session.id,
              name: session.name,
              workingDirectory: session.workingDirectory,
              messages: session.messages,
            },
          }),
        );
      } else {
        throw new Error("Session not found");
      }
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", content: error.message }));
    }
  }

  private async handleGetChatHistory(ws: WebSocket): Promise<void> {
    try {
      const history = this.agent.getChatHistory();
      ws.send(
        JSON.stringify({
          type: "chat_history",
          messages: history.map(entry => ({
            role: entry.type === "user" ? "user" : "assistant",
            content: entry.content,
            timestamp: entry.timestamp,
            toolCall: entry.toolCall,
            toolResult: entry.toolResult,
          })),
        }),
      );
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", content: error.message }));
    }
  }

  private async checkAndSendUpdateNotification(ws: WebSocket): Promise<void> {
    try {
      const pkg = await import("../../package.json");
      const { getUpdateChecker } = await import("../utils/update-checker");
      const updateChecker = getUpdateChecker(pkg.version);
      const updateInfo = await updateChecker.checkForUpdates();

      if (updateInfo?.updateAvailable) {
        ws.send(
          JSON.stringify({
            type: "update_available",
            currentVersion: updateInfo.currentVersion,
            latestVersion: updateInfo.latestVersion,
          }),
        );
      }
    } catch (error) {
      // Silently ignore errors
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, this.hostname, () => {
        const url = `http://${this.hostname}:${this.port}`;
        console.log(`🌐 Web interface available at ${url}`);
        resolve();
      });

      this.httpServer.on("error", error => {
        reject(error);
      });
    });
  }

  public async openBrowser(): Promise<void> {
    const url = `http://${this.hostname}:${this.port}`;
    try {
      await open(url);
      console.log(`🚀 Opened browser at ${url}`);
    } catch (error) {
      console.warn(`Could not open browser automatically. Please visit ${url}`);
    }
  }

  public stop(): void {
    this.clients.forEach(client => {
      client.close();
    });
    this.wss.close();
    this.httpServer.close();
    console.log("🛑 Web server stopped");
  }
}
