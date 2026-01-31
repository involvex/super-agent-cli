import { FileContextProvider } from "./file-context";
import { CLIConnector } from "./cli-connector";
import { ChatProvider } from "./chat-provider";
import * as vscode from "vscode";

let cliConnector: CLIConnector;
let fileContextProvider: FileContextProvider;
let chatProvider: ChatProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log("Super Agent VS Code extension is now active");

  // Initialize services
  cliConnector = new CLIConnector(context);
  fileContextProvider = new FileContextProvider();
  chatProvider = new ChatProvider(
    context,
    context.extensionUri,
    cliConnector,
    fileContextProvider,
  );

  // Register the chat webview view
  const chatViewProvider = vscode.window.registerWebviewViewProvider(
    "super-agent.chat",
    {
      resolveWebviewView: webviewView => {
        chatProvider.resolveWebviewView(webviewView);
      },
    },
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );
  context.subscriptions.push(chatViewProvider);

  // Register commands
  const openChatCommand = vscode.commands.registerCommand(
    "super-agent.openChat",
    () => {
      vscode.commands.executeCommand("super-agent.chat.focus");
    },
  );
  context.subscriptions.push(openChatCommand);

  const mentionFileCommand = vscode.commands.registerCommand(
    "super-agent.mentionFile",
    async () => {
      const filePath = await fileContextProvider.showFilePicker();
      if (filePath) {
        const relativePath = fileContextProvider.getRelativePath(filePath);
        const message = `@${relativePath} `;
        // Send message to chat
        chatProvider["handleSendMessage"](message);
      }
    },
  );
  context.subscriptions.push(mentionFileCommand);

  const askAICommand = vscode.commands.registerCommand(
    "super-agent.askAI",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }

      const selection = editor.selection;
      const selectedText =
        editor.document.getText(selection) || editor.document.getText();
      const filePath = editor.document.uri.fsPath;
      const relativePath = fileContextProvider.getRelativePath(filePath);

      // Create message with file mention and selected text
      const message = await vscode.window.showInputBox({
        prompt: "Ask Super Agent AI",
        value: `Explain this code:`,
      });

      if (message) {
        const fullMessage = `@${relativePath}\n${message}\n\n\`\`\`\n${selectedText}\n\`\`\``;
        chatProvider["handleSendMessage"](fullMessage);
      }
    },
  );
  context.subscriptions.push(askAICommand);

  // Auto-connect to CLI if setting is enabled
  const config = vscode.workspace.getConfiguration("superAgent");
  if (config.get<boolean>("autoConnect", true)) {
    cliConnector.connect().catch(error => {
      console.error("Failed to connect to CLI:", error);
    });
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("superAgent")) {
        // Reconnect if settings changed
        cliConnector.disconnect();
        const config = vscode.workspace.getConfiguration("superAgent");
        if (config.get<boolean>("autoConnect", true)) {
          cliConnector.connect().catch(() => {});
        }
      }
    }),
  );

  // Update status bar
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(robot) Super Agent";
  statusBarItem.command = "super-agent.openChat";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar connection status
  cliConnector.onStatusChange(connected => {
    statusBarItem.text = connected
      ? "$(check) Super Agent"
      : "$(error) Super Agent";
    statusBarItem.tooltip = connected
      ? "Connected to CLI"
      : "Disconnected from CLI";
  });
}

export function deactivate() {
  if (cliConnector) {
    cliConnector.disconnect();
  }
  if (chatProvider) {
    chatProvider.dispose();
  }
}
