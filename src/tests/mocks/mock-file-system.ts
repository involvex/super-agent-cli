import type { ToolResult } from "../../types";

export class MockFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private shouldFail: boolean = false;
  private failMessage: string = "Mock file system error";

  constructor() {
    this.directories.add("/");
  }

  async readFile(filePath: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(filePath);
    if (this.files.has(normalizedPath)) {
      return this.files.get(normalizedPath)!;
    }
    throw new Error(`File not found: ${filePath}`);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(filePath);
    const dirPath = this.getDirPath(normalizedPath);
    this.directories.add(dirPath);
    this.files.set(normalizedPath, content);
  }

  async pathExists(filePath: string): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(filePath);
    return (
      this.files.has(normalizedPath) || this.directories.has(normalizedPath)
    );
  }

  async stat(filePath: string): Promise<{ isDirectory: () => boolean }> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(filePath);
    if (this.directories.has(normalizedPath)) {
      return { isDirectory: () => true };
    }
    if (this.files.has(normalizedPath)) {
      return { isDirectory: () => false };
    }
    throw new Error(`Path not found: ${filePath}`);
  }

  async readdir(dirPath: string): Promise<string[]> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(dirPath);
    if (!this.directories.has(normalizedPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const files: string[] = [];
    for (const [path] of Array.from(this.files.entries())) {
      if (path[0].startsWith(normalizedPath + "/")) {
        const relativePath = path[0].slice(normalizedPath.length + 1);
        const parts = relativePath.split("/");
        if (parts.length === 1) {
          files.push(parts[0]);
        }
      }
    }

    for (const dir of Array.from(this.directories)) {
      if (dir.startsWith(normalizedPath + "/")) {
        const relativePath = dir.slice(normalizedPath.length + 1);
        const parts = relativePath.split("/");
        if (parts.length === 1) {
          files.push(parts[0]);
        }
      }
    }

    return files;
  }

  async remove(filePath: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(filePath);
    if (this.files.has(normalizedPath)) {
      this.files.delete(normalizedPath);
    } else if (this.directories.has(normalizedPath)) {
      this.directories.delete(normalizedPath);
    } else {
      throw new Error(`Path not found: ${filePath}`);
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    const normalizedPath = this.normalizePath(dirPath);
    this.directories.add(normalizedPath);
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/\/+/g, "/");
  }

  private getDirPath(filePath: string): string {
    const normalized = this.normalizePath(filePath);
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash > 0 ? normalized.slice(0, lastSlash) : "/";
  }

  setFile(filePath: string, content: string): void {
    const normalizedPath = this.normalizePath(filePath);
    const dirPath = this.getDirPath(normalizedPath);
    this.directories.add(dirPath);
    this.files.set(normalizedPath, content);
  }

  getFile(filePath: string): string | undefined {
    return this.files.get(this.normalizePath(filePath));
  }

  hasFile(filePath: string): boolean {
    return this.files.has(this.normalizePath(filePath));
  }

  hasDirectory(dirPath: string): boolean {
    return this.directories.has(this.normalizePath(dirPath));
  }

  setShouldFail(
    shouldFail: boolean,
    message: string = "Mock file system error",
  ): void {
    this.shouldFail = shouldFail;
    this.failMessage = message;
  }

  reset(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add("/");
    this.shouldFail = false;
  }
}

let instance: MockFileSystem | null = null;

export function getMockFileSystem(): MockFileSystem {
  if (!instance) {
    instance = new MockFileSystem();
  }
  return instance;
}

export function resetMockFileSystem(): void {
  instance = null;
}
