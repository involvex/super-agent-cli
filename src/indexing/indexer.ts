import { getSettingsManager } from "../utils/settings-manager";
import { FileIndex, FileIndexEntry } from "./types";
import * as path from "path";
import fs from "fs-extra";

const INDEX_VERSION = 1;
const INDEX_FILENAME = "index.json";

export class FileIndexer {
  private static instance: FileIndexer;
  private index: FileIndex | null = null;
  private storagePath: string;
  private rootPath: string;
  private isScanning: boolean = false;

  private constructor() {
    const settingsManager = getSettingsManager();
    this.storagePath = path.join(
      settingsManager.getStorageDirectory(),
      INDEX_FILENAME,
    );
    this.rootPath = process.cwd();
  }

  public static getInstance(): FileIndexer {
    if (!FileIndexer.instance) {
      FileIndexer.instance = new FileIndexer();
    }
    return FileIndexer.instance;
  }

  public async loadIndex(): Promise<void> {
    try {
      if (fs.existsSync(this.storagePath)) {
        const content = await fs.readFile(this.storagePath, "utf-8");
        this.index = JSON.parse(content);
        // Verify version and root path match
        if (
          !this.index ||
          this.index.metadata.version !== INDEX_VERSION ||
          this.index.metadata.rootPath !== this.rootPath
        ) {
          // Invalid or stale index, reset
          this.index = null;
          // Trigger background scan?
        }
      }
    } catch (error) {
      console.warn("Failed to load file index:", error);
      this.index = null;
    }
  }

  public async saveIndex(): Promise<void> {
    if (!this.index) {
      return;
    }
    try {
      await fs.outputFile(
        this.storagePath,
        JSON.stringify(this.index, null, 2),
      );
    } catch (error) {
      console.error("Failed to save file index:", error);
    }
  }

  public getIndex(): FileIndex | null {
    return this.index;
  }

  public async fullScan(options: { force?: boolean } = {}): Promise<void> {
    if (this.isScanning) {
      return;
    }
    this.isScanning = true;

    try {
      const ignoreList = [
        "node_modules",
        ".git",
        ".super-agent",
        "dist",
        "build",
        ".next",
        "coverage",
        ".DS_Store",
      ];

      const entries: FileIndexEntry[] = [];
      const scanDir = async (dir: string) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          if (ignoreList.includes(file.name) || file.name.startsWith(".")) {
            if (file.name !== ".env") {
              continue;
            }
          }

          const fullPath = path.join(dir, file.name);
          const relativePath = path.relative(this.rootPath, fullPath);

          if (file.isDirectory()) {
            entries.push({
              path: relativePath,
              size: 0,
              lastModified: 0,
              isDirectory: true,
            });
            await scanDir(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            entries.push({
              path: relativePath,
              size: stats.size,
              lastModified: stats.mtimeMs,
              isDirectory: false,
            });
          }
        }
      };

      await scanDir(this.rootPath);

      this.index = {
        metadata: {
          version: INDEX_VERSION,
          lastScan: Date.now(),
          rootPath: this.rootPath,
        },
        entries,
      };

      await this.saveIndex();
    } catch (error) {
      console.error("Error during file scan:", error);
    } finally {
      this.isScanning = false;
    }
  }
}

export function getFileIndexer(): FileIndexer {
  return FileIndexer.getInstance();
}
