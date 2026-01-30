import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export function resolveSourcePath(source: string): string {
  const defaults: Record<string, string> = {
    gemini: "~/.gemini",
    claude: "~/.claude",
    kilo: "~/.kilocode",
  };

  const rawPath = defaults[source.toLowerCase()] || source;
  return expandHome(rawPath);
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export async function listFilesRecursive(
  dir: string,
  baseDir: string = dir,
  maxDepth: number = 3,
): Promise<FileEntry[]> {
  const result: FileEntry[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Basic ignore list
      const isIgnored = [
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "target",
        "vendor",
      ].includes(entry.name);

      if (isIgnored) {
        continue;
      }
      if (entry.name.startsWith(".") && entry.name !== ".env") {
        continue;
      }

      result.push({
        name: entry.name,
        path: relativePath,
        isDirectory: entry.isDirectory(),
      });

      if (entry.isDirectory() && maxDepth > 0) {
        const subFiles = await listFilesRecursive(
          fullPath,
          baseDir,
          maxDepth - 1,
        );
        result.push(...subFiles);
      }
    }
  } catch (error) {
    // Silent fail for inaccessible dirs
  }

  return result;
}

/**
 * Filters file entries based on a query string
 */
export function filterFileEntries(
  entries: FileEntry[],
  query: string,
): FileEntry[] {
  if (!query) {
    return entries.slice(0, 20);
  }

  const lowerQuery = query.toLowerCase();
  return entries
    .filter(e => e.path.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      // Prioritize exact name matches
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      if (aLower === lowerQuery && bLower !== lowerQuery) {
        return -1;
      }
      if (bLower === lowerQuery && aLower !== lowerQuery) {
        return 1;
      }

      // Prioritize path starts with query
      const aPathLower = a.path.toLowerCase();
      const bPathLower = b.path.toLowerCase();
      if (
        aPathLower.startsWith(lowerQuery) &&
        !bPathLower.startsWith(lowerQuery)
      ) {
        return -1;
      }
      if (
        bPathLower.startsWith(lowerQuery) &&
        !aPathLower.startsWith(lowerQuery)
      ) {
        return 1;
      }

      return a.path.length - b.path.length;
    })
    .slice(0, 20);
}
