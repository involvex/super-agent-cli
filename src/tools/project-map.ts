import { ToolResult } from "../types/index";
import * as path from "path";
import fs from "fs-extra";

export class ProjectMapTool {
  private currentDirectory: string = process.cwd();

  /**
   * Generate a map of the project structure
   */
  async getProjectMap(maxDepth: number = 2): Promise<ToolResult> {
    try {
      const tree = await this.generateTree(this.currentDirectory, maxDepth);
      const importantFiles = await this.findImportantFiles();

      let output = `Project Structure (depth: ${maxDepth}):\n${tree}\n`;
      if (importantFiles.length > 0) {
        output += `\nImportant Files:\n  ${importantFiles.join("\n  ")}`;
      }

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error generating project map: ${error.message}`,
      };
    }
  }

  private async generateTree(
    dir: string,
    maxDepth: number,
    currentDepth: number = 0,
  ): Promise<string> {
    if (currentDepth > maxDepth) {
      return "";
    }

    let result = "";
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) {
          return -1;
        }
        if (!a.isDirectory() && b.isDirectory()) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });

      for (const entry of sortedEntries) {
        const isHidden = entry.name.startsWith(".");
        const isIgnored = [
          "node_modules",
          "dist",
          "build",
          "target",
          "vendor",
          "bin",
          "obj",
        ].includes(entry.name);

        if (
          isIgnored ||
          (isHidden && entry.name !== ".env" && entry.name !== ".gitignore")
        ) {
          continue;
        }

        const indent = "  ".repeat(currentDepth);
        if (entry.isDirectory()) {
          result += `${indent}📁 ${entry.name}/\n`;
          result += await this.generateTree(
            path.join(dir, entry.name),
            maxDepth,
            currentDepth + 1,
          );
        } else {
          result += `${indent}📄 ${entry.name}\n`;
        }
      }
    } catch (e) {
      // Skip inaccessible dirs
    }
    return result;
  }

  private async findImportantFiles(): Promise<string[]> {
    const importantPatterns = [
      "package.json",
      "tsconfig.json",
      "README.md",
      "settings.json",
      ".env",
      "src/index.ts",
      "server.ts",
      "app.ts",
    ];

    const found: string[] = [];
    for (const pattern of importantPatterns) {
      const fullPath = path.join(this.currentDirectory, pattern);
      if (await fs.pathExists(fullPath)) {
        found.push(pattern);
      }
    }
    return found;
  }

  setCurrentDirectory(directory: string): void {
    this.currentDirectory = directory;
  }
}
