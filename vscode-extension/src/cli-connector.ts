import * as vscode from "vscode";
import { WebSocket } from "ws";

export interface CLIMessage {
  type: string;
  content?: any;
  error?: string;
}

export interface CLIResponse {
  type: string;
  content?: any;
  error?: string;
}

export class CLIConnector {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (message: CLIResponse) => void> =
    new Map();
  private statusChangeHandlers: ((connected: boolean) => void)[] = [];
  private hasShownConnectionError = false; // Track if we've shown the error
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Stop trying after N attempts

  constructor(private context: vscode.ExtensionContext) {
    this.loadSettings();
  }

  private loadSettings() {
    const config = vscode.workspace.getConfiguration("superAgent");
    return {
      cliPort: config.get<number>("cliPort", 3000),
      cliHost: config.get<string>("cliHost", "localhost"),
      autoConnect: config.get<boolean>("autoConnect", true),
    };
  }

  async connect(): Promise<boolean> {
    const settings = this.loadSettings();
    const wsUrl = `ws://${settings.cliHost}:${settings.cliPort}`;

    console.log(`[Super Agent] Attempting to connect to ${wsUrl}...`);

    return new Promise((resolve, reject) => {
      try {
        if (this.ws) {
          this.ws.terminate();
        }

        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.terminate();
            reject(new Error("Connection timed out"));
          }
        }, 5000);

        this.ws.on("open", () => {
          clearTimeout(connectionTimeout);
          console.log(
            `[Super Agent] Successfully connected to CLI at ${wsUrl}`,
          );
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.hasShownConnectionError = false;
          this.notifyStatusChange(true);
          this.clearReconnectTimer();
          resolve(true);
        });

        this.ws.on("error", error => {
          clearTimeout(connectionTimeout);
          console.error(`[Super Agent] WebSocket error:`, error);
          this.isConnected = false;
          this.notifyStatusChange(false);

          if (this.reconnectAttempts === 0 && !this.hasShownConnectionError) {
            this.showConnectionError();
            this.hasShownConnectionError = true;
          }
          this.scheduleReconnect();
          reject(error);
        });

        this.ws.on("close", (code, reason) => {
          console.log(`[Super Agent] Connection closed: ${code} ${reason}`);
          this.isConnected = false;
          this.notifyStatusChange(false);
          if (code !== 1000) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("message", data => {
          try {
            const message: CLIResponse = JSON.parse(data.toString());
            console.log(`[Super Agent] Received message: ${message.type}`);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse CLI message:", error);
          }
        });
      } catch (error) {
        this.isConnected = false;
        this.notifyStatusChange(false);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close(1000, "Normal closure");
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatusChange(false);
  }

  async startCLIServer(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const terminal = vscode.window.createTerminal({
      name: "Super Agent CLI",
      cwd: workspaceRoot,
    });

    terminal.show();

    // Explicitly use PowerShell on Windows to ensure our script works
    if (process.platform === "win32") {
      terminal.sendText(
        "powershell -ExecutionPolicy Bypass -Command \"if (Test-Path 'super-agent.js') { bun super-agent.js web } else { super-agent web }\"",
      );
    } else {
      terminal.sendText(
        "if [ -f super-agent.js ]; then bun super-agent.js web; else super-agent web; fi",
      );
    }

    // Give it more time to start up
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting Super Agent CLI Server...",
        cancellable: false,
      },
      async progress => {
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          progress.report({ increment: 20 });
        }
      },
    );

    this.resetConnectionState();
    try {
      await this.connect();
      vscode.window.showInformationMessage("✓ Connected to Super Agent CLI");
    } catch (e) {
      const settings = this.loadSettings();
      console.error(
        `Failed to connect to ${settings.cliHost}:${settings.cliPort} after starting server:`,
        e,
      );
      vscode.window.showErrorMessage(
        `Failed to connect to CLI at ${settings.cliHost}:${settings.cliPort}. Please check the terminal for errors.`,
      );
    }
  }

  private async showConnectionError(): Promise<void> {
    const selection = await vscode.window.showWarningMessage(
      "Could not connect to Super Agent CLI.",
      "Start CLI Server",
      "Retry",
    );

    if (selection === "Start CLI Server") {
      this.startCLIServer();
    } else if (selection === "Retry") {
      this.connect();
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    // Stop reconnecting after max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached. Stopping auto-reconnect.");
      return;
    }

    this.reconnectAttempts++;
    const settings = this.loadSettings();
    if (settings.autoConnect) {
      // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
      const delay = Math.min(
        5000 * Math.pow(2, this.reconnectAttempts - 1),
        60000,
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {
          // Silently fail on reconnect
        });
      }, delay);
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  sendMessage(type: string, content?: any): void {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      const message: CLIMessage = { type, content };
      this.ws.send(JSON.stringify(message));
    } else {
      // Only show message if user explicitly tries to send
      if (type === "chat_message" || type === "command") {
        vscode.window.showWarningMessage(
          "Not connected to Super Agent CLI. Please run 'super-agent web' in your project directory.",
        );
      }
    }
  }

  onMessage(type: string, handler: (message: CLIResponse) => void): () => void {
    this.messageHandlers.set(type, handler);
    return () => this.messageHandlers.delete(type);
  }

  private handleMessage(message: CLIResponse): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Also handle wildcard handlers
    const wildcardHandler = this.messageHandlers.get("*");
    if (wildcardHandler) {
      wildcardHandler(message);
    }
  }

  onStatusChange(handler: (connected: boolean) => void): () => void {
    this.statusChangeHandlers.push(handler);
    return () => {
      const index = this.statusChangeHandlers.indexOf(handler);
      if (index > -1) {
        this.statusChangeHandlers.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(connected: boolean): void {
    for (const handler of this.statusChangeHandlers) {
      handler(connected);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Reset connection state (call this when user manually triggers connection)
   */
  resetConnectionState(): void {
    this.reconnectAttempts = 0;
    this.hasShownConnectionError = false;
  }

  /**
   * Request file tree from CLI
   */
  requestFileTree(): void {
    this.sendMessage("get_file_tree");
  }

  /**
   * Request chat history from CLI
   */
  requestChatHistory(): void {
    this.sendMessage("get_chat_history");
  }

  /**
   * Send a message to the CLI
   */
  sendChatMessage(message: string, fileContexts?: string[]): void {
    // CLI expects 'prompt' type and string content
    this.sendMessage("prompt", message);
  }

  /**
   * Request file content from CLI
   */
  requestFileContent(filePath: string): void {
    // CLI expects 'path' parameter
    this.sendMessage("get_file_content", { path: filePath });
  }

  /**
   * Send a command to the CLI
   */
  sendCommand(command: string): void {
    this.sendMessage("command", { command });
  }

  /**
   * Abort current operation in CLI
   */
  abortOperation(): void {
    this.sendMessage("abort");
  }
}
