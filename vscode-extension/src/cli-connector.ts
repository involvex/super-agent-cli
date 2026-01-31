import * as vscode from "vscode";
import WebSocket from "ws";

export interface CLIMessage {
  type: string;
  content?: any;
  error?: string;
}

export interface CLIResponse {
  type: "message" | "error" | "status" | "file_context";
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

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.on("open", () => {
          this.isConnected = true;
          this.notifyStatusChange(true);
          vscode.window.showInformationMessage("Connected to Super Agent CLI");
          this.clearReconnectTimer();
          resolve(true);
        });

        this.ws.on("error", error => {
          this.isConnected = false;
          this.notifyStatusChange(false);
          vscode.window.showWarningMessage(
            "Could not connect to Super Agent CLI. Make sure it's running with --web flag.",
          );
          this.scheduleReconnect();
          reject(error);
        });

        this.ws.on("close", () => {
          this.isConnected = false;
          this.notifyStatusChange(false);
          this.scheduleReconnect();
        });

        this.ws.on("message", data => {
          try {
            const message: CLIResponse = JSON.parse(data.toString());
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatusChange(false);
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      const settings = this.loadSettings();
      if (settings.autoConnect) {
        this.connect().catch(() => {
          // Silently fail on reconnect
        });
      }
    }, 5000); // Reconnect after 5 seconds
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
      vscode.window.showWarningMessage(
        "Not connected to Super Agent CLI. Please run 'super-agent --web' in your project.",
      );
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
    this.sendMessage("chat_message", {
      message,
      fileContexts,
    });
  }

  /**
   * Request file content from CLI
   */
  requestFileContent(filePath: string): void {
    this.sendMessage("get_file_content", { filePath });
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
