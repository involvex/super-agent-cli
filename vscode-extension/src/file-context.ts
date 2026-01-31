import * as vscode from "vscode";
import * as path from "path";

export interface FileMention {
  path: string;
  content?: string;
  language?: string;
  relativePath?: string;
}

export class FileContextProvider {
  private workspaceRoot: string | undefined;

  constructor() {
    this.updateWorkspaceRoot();

    // Listen for workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.updateWorkspaceRoot();
    });
  }

  private updateWorkspaceRoot(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    }
  }

  /**
   * Get the file path for the currently active editor
   */
  getActiveFilePath(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.uri.fsPath;
    }
    return undefined;
  }

  /**
   * Get the relative path for a file path from the workspace root
   */
  getRelativePath(filePath: string): string {
    if (this.workspaceRoot) {
      return path.relative(this.workspaceRoot, filePath);
    }
    return filePath;
  }

  /**
   * Get file content as a mention object
   */
  getFileMention(filePath: string): FileMention | undefined {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = vscode.workspace.textDocuments.find(
        doc => doc.uri.fsPath === filePath,
      );

      if (document) {
        // File is open in editor
        return {
          path: filePath,
          relativePath: this.getRelativePath(filePath),
          content: document.getText(),
          language: document.languageId,
        };
      } else {
        // Read file from disk
        const content = vscode.workspace.fs.readFileSync(uri);
        return {
          path: filePath,
          relativePath: this.getRelativePath(filePath),
          content: Buffer.from(content).toString("utf-8"),
          language: this.getLanguageFromPath(filePath),
        };
      }
    } catch (error) {
      console.error(`Failed to read file: ${filePath}`, error);
      return undefined;
    }
  }

  /**
   * Get the current file mention for the active editor
   */
  getCurrentFileMention(): FileMention | undefined {
    const filePath = this.getActiveFilePath();
    if (filePath) {
      return this.getFileMention(filePath);
    }
    return undefined;
  }

  /**
   * Get all open file mentions
   */
  getOpenFileMentions(): FileMention[] {
    const mentions: FileMention[] = [];

    for (const document of vscode.workspace.textDocuments) {
      if (document.uri.scheme === "file") {
        const mention = this.getFileMention(document.uri.fsPath);
        if (mention) {
          mentions.push(mention);
        }
      }
    }

    return mentions;
  }

  /**
   * Get language ID from file path
   */
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescriptreact",
      ".js": "javascript",
      ".jsx": "javascriptreact",
      ".py": "python",
      ".rs": "rust",
      ".go": "go",
      ".java": "java",
      ".cpp": "cpp",
      ".c": "c",
      ".cs": "csharp",
      ".php": "php",
      ".rb": "ruby",
      ".swift": "swift",
      ".kt": "kotlin",
      ".scala": "scala",
      ".sh": "shellscript",
      ".bash": "shellscript",
      ".zsh": "shellscript",
      ".fish": "fish",
      ".ps1": "powershell",
      ".json": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".toml": "toml",
      ".xml": "xml",
      ".html": "html",
      ".css": "css",
      ".scss": "scss",
      ".less": "less",
      ".md": "markdown",
      ".sql": "sql",
      ".dockerfile": "dockerfile",
      ".dockerignore": "ignore",
      ".gitignore": "ignore",
      ".editorconfig": "editorconfig",
      ".env": "dotenv",
    };

    return languageMap[ext] || "plaintext";
  }

  /**
   * Parse file mentions from input text (e.g., "@src/index.ts")
   */
  parseFileMentions(input: string): string[] {
    const mentionPattern = /@([^\s]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionPattern.exec(input)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Replace file mentions with their content
   */
  async expandFileMentions(input: string): Promise<string> {
    const mentions = this.parseFileMentions(input);
    let expandedInput = input;

    for (const mention of mentions) {
      let filePath = mention;

      // Convert relative path to absolute if needed
      if (this.workspaceRoot && !path.isAbsolute(filePath)) {
        filePath = path.join(this.workspaceRoot, filePath);
      }

      const fileMention = this.getFileMention(filePath);
      if (fileMention && fileMention.content !== undefined) {
        const placeholder = `\n--- File: ${fileMention.relativePath} ---\n${fileMention.content}\n--- End of ${fileMention.relativePath} ---\n`;
        expandedInput = expandedInput.replace(`@${mention}`, placeholder);
      }
    }

    return expandedInput;
  }

  /**
   * Show file picker for selecting files to mention
   */
  async showFilePicker(): Promise<string | undefined> {
    if (!this.workspaceRoot) {
      vscode.window.showWarningMessage("No workspace folder open");
      return undefined;
    }

    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(this.workspaceRoot),
      openLabel: "Select File to Mention",
    });

    if (fileUri && fileUri.length > 0) {
      return fileUri[0].fsPath;
    }

    return undefined;
  }
}
