import { FileContextProvider, FileMention } from "./file-context";
import { CLIConnector, CLIResponse } from "./cli-connector";
import * as vscode from "vscode";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileContexts?: FileMention[];
}

export class ChatProvider {
  private messages: ChatMessage[] = [];
  private webviewView: vscode.WebviewView | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private extensionUri: vscode.Uri,
    private cliConnector: CLIConnector,
    private fileContextProvider: FileContextProvider,
  ) {
    this.setupCLIMessageHandlers();

    // Listen for status changes from the connector
    this.disposables.push(
      new vscode.Disposable(
        this.cliConnector.onStatusChange(connected => {
          this.updateConnectionStatus(connected);
        }),
      ),
    );
  }

  private setupCLIMessageHandlers(): void {
    // Handle incoming messages from CLI
    // CLI sends 'assistant_message', 'user_message', 'tool_call', 'tool_result', 'done', 'error'
    this.cliConnector.onMessage(
      "assistant_message",
      (response: CLIResponse) => {
        this.addAssistantMessage(response.content || "");
        this.updateWebview();
      },
    );

    this.cliConnector.onMessage("user_message", (response: CLIResponse) => {
      // Optional: handle if we want to sync user messages from other clients
    });

    this.cliConnector.onMessage("tool_call", (response: CLIResponse) => {
      this.addSystemMessage(`Tool: ${response.content || "Executing..."}`);
      this.updateWebview();
    });

    this.cliConnector.onMessage("error", (response: CLIResponse) => {
      this.addSystemMessage(`Error: ${response.error || response.content}`);
      this.updateWebview();
    });

    this.cliConnector.onMessage("done", () => {
      // Handle completion if needed
    });

    this.cliConnector.onMessage("file_tree", (response: any) => {
      // Handle file tree if needed
    });

    this.cliConnector.onMessage("file_content", (response: any) => {
      // Handle file content if needed
    });

    this.cliConnector.onMessage("chat_history", (response: any) => {
      if (response.messages) {
        this.messages = response.messages.map((msg: any) => ({
          id: this.generateId(),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));
        this.updateWebview();
      }
    });
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      async message => {
        await this.handleWebviewMessage(message);
      },
      null,
      this.disposables,
    );

    // Update with current connection status
    this.updateConnectionStatus(this.cliConnector.getConnectionStatus());
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.type) {
      case "ready":
        this.updateConnectionStatus(this.cliConnector.getConnectionStatus());
        this.cliConnector.requestChatHistory();
        break;

      case "sendMessage":
        await this.handleSendMessage(message.content);
        break;

      case "getFileContext":
        await this.handleGetFileContext();
        break;

      case "openFile":
        await this.handleOpenFile(message.filePath);
        break;

      case "requestHistory":
        this.cliConnector.requestChatHistory();
        break;

      case "clearHistory":
        this.messages = [];
        this.updateWebview();
        break;

      case "abort":
        this.cliConnector.abortOperation();
        break;
    }
  }

  private async handleSendMessage(content: string): Promise<void> {
    // Expand file mentions if any
    const expandedContent =
      await this.fileContextProvider.expandFileMentions(content);

    // Parse file mentions for display
    const mentions = this.fileContextProvider.parseFileMentions(content);
    const fileContexts: FileMention[] = [];

    for (const mention of mentions) {
      const filePath = mention.startsWith("/") ? mention : mention; // Handle both absolute and relative paths

      if (vscode.workspace.workspaceFolders) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const absolutePath = require("path").join(workspaceRoot, filePath);
        const fileMention =
          await this.fileContextProvider.getFileMention(absolutePath);
        if (fileMention) {
          fileContexts.push(fileMention);
        }
      }
    }

    // Add user message
    this.addUserMessage(content, fileContexts);
    this.updateWebview();

    // Send to CLI
    this.cliConnector.sendChatMessage(expandedContent, mentions);
  }

  private async handleGetFileContext(): Promise<void> {
    const currentFile = await this.fileContextProvider.getCurrentFileMention();
    const openFiles = await this.fileContextProvider.getOpenFileMentions();

    this.postMessageToWebview({
      type: "fileContext",
      currentFile,
      openFiles,
    });
  }

  private async handleOpenFile(filePath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(filePath),
      );
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
    }
  }

  private addUserMessage(content: string, fileContexts?: FileMention[]): void {
    this.messages.push({
      id: this.generateId(),
      role: "user",
      content,
      timestamp: new Date(),
      fileContexts,
    });
  }

  private addAssistantMessage(content: string): void {
    this.messages.push({
      id: this.generateId(),
      role: "assistant",
      content,
      timestamp: new Date(),
    });
  }

  private addSystemMessage(content: string): void {
    this.messages.push({
      id: this.generateId(),
      role: "system",
      content,
      timestamp: new Date(),
    });
  }

  private updateWebview(): void {
    this.postMessageToWebview({
      type: "messages",
      messages: this.messages,
    });
  }

  private updateConnectionStatus(connected: boolean): void {
    this.postMessageToWebview({
      type: "connectionStatus",
      connected,
    });
  }

  private postMessageToWebview(message: any): void {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(this.extensionUri.path + "/dist/chat.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(this.extensionUri.path + "/dist/chat.css"),
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Agent Chat</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="title">Super Agent</span>
      <span class="status" id="status">Connecting...</span>
    </div>
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <input type="text" id="prompt" placeholder="@file.ts Ask something... (Press Enter to send)" autocomplete="off">
      <button id="send">Send</button>
      <button id="abort" style="display: none;">Stop</button>
    </div>
    <div class="file-context" id="fileContext" style="display: none;">
      <button id="mentionCurrent">@ Current File</button>
    </div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
