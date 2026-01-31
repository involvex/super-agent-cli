import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs-extra";
import * as path from "path";

const execAsync = promisify(exec);

export interface RepositoryConfig {
  type: "agents" | "skills" | "hooks" | "mcp";
  url: string;
  branch?: string;
  localPath?: string;
}

export interface RepositoryItem {
  name: string;
  type: string;
  path: string;
  description?: string;
  enabled: boolean;
}

export const BUILTIN_REPOSITORIES: Record<string, RepositoryConfig> = {
  agents: {
    type: "agents",
    url: "https://github.com/involvex/super-agent-agents.git",
    branch: "main",
  },
  skills: {
    type: "skills",
    url: "https://github.com/involvex/super-agent-skills.git",
    branch: "main",
  },
  hooks: {
    type: "hooks",
    url: "https://github.com/involvex/super-agent-hooks.git",
    branch: "main",
  },
  mcp: {
    type: "mcp",
    url: "https://github.com/involvex/super-agent-mcp-servers.git",
    branch: "main",
  },
};

export class RepositoryManager {
  private static instance: RepositoryManager;
  private reposDir: string;
  private installedRepos: Map<string, RepositoryConfig> = new Map();

  private constructor() {
    this.reposDir = path.join(process.cwd(), "@repos");
    fs.ensureDirSync(this.reposDir);
  }

  public static getInstance(): RepositoryManager {
    if (!RepositoryManager.instance) {
      RepositoryManager.instance = new RepositoryManager();
    }
    return RepositoryManager.instance;
  }

  /**
   * Install a repository as a git submodule
   */
  async installRepository(
    repoKey: string,
    config?: RepositoryConfig,
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    const repoConfig = config || BUILTIN_REPOSITORIES[repoKey];
    if (!repoConfig) {
      return { success: false, error: `Unknown repository: ${repoKey}` };
    }

    const targetDir = path.join(this.reposDir, repoConfig.type);

    try {
      // Check if already installed
      if (await fs.pathExists(targetDir)) {
        return {
          success: false,
          error: `Repository already installed at ${targetDir}`,
        };
      }

      // Check if we're in a git repository
      const gitRoot = process.cwd();
      const gitDirPath = path.join(gitRoot, ".git");

      if (!(await fs.pathExists(gitDirPath))) {
        // Not in a git repo, just clone instead of using submodule
        await execAsync(`git clone ${repoConfig.url} ${targetDir}`, {
          cwd: process.cwd(),
        });
      } else {
        // Add as git submodule
        try {
          await execAsync(`git submodule add ${repoConfig.url} ${targetDir}`, {
            cwd: process.cwd(),
          });
        } catch (submoduleError: any) {
          // If submodule add fails, fall back to regular clone
          await execAsync(`git clone ${repoConfig.url} ${targetDir}`, {
            cwd: process.cwd(),
          });
        }

        // Update .gitmodules if needed
        try {
          await execAsync(`git submodule update --init --recursive`, {
            cwd: process.cwd(),
          });
        } catch {
          // Ignore update errors
        }
      }

      this.installedRepos.set(repoKey, repoConfig);

      return { success: true, path: targetDir };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update all installed repositories
   */
  async updateRepositories(): Promise<{ updated: string[]; errors: string[] }> {
    const updated: string[] = [];
    const errors: string[] = [];

    for (const [key, config] of this.installedRepos) {
      const targetDir = path.join(this.reposDir, config.type);
      try {
        if (await fs.pathExists(targetDir)) {
          await execAsync(`git pull origin ${config.branch || "main"}`, {
            cwd: targetDir,
          });
          updated.push(key);
        }
      } catch (error: any) {
        errors.push(`${key}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * List available items from all repositories
   */
  async listAvailableItems(): Promise<RepositoryItem[]> {
    const items: RepositoryItem[] = [];

    for (const [key, config] of this.installedRepos) {
      const repoDir = path.join(this.reposDir, config.type);
      if (!(await fs.pathExists(repoDir))) {
        continue;
      }

      // Scan for items (agents, skills, hooks, etc.)
      try {
        const entries = await fs.readdir(repoDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const itemPath = path.join(repoDir, entry.name);
            const configPath = path.join(itemPath, "config.json");
            if (await fs.pathExists(configPath)) {
              try {
                const itemConfig = await fs.readJson(configPath);
                items.push({
                  name: entry.name,
                  type: config.type,
                  path: itemPath,
                  description: itemConfig.description,
                  enabled: false,
                });
              } catch {
                // Skip items with invalid config
              }
            }
          }
        }
      } catch {
        // Skip repos we can't read
      }
    }

    return items;
  }

  /**
   * Enable an item from repository
   */
  async enableItem(item: RepositoryItem): Promise<boolean> {
    try {
      // Add to settings or symlink to active directory
      const activeDir = path.join(process.cwd(), `@${item.type}`);
      await fs.ensureDir(activeDir);

      const sourcePath = item.path;
      const targetPath = path.join(activeDir, path.basename(item.path));

      // Create symlink or copy
      if (!(await fs.pathExists(targetPath))) {
        try {
          await fs.symlink(sourcePath, targetPath, "dir");
        } catch {
          // Symlink might fail on Windows or without permissions, fall back to copy
          await fs.copy(sourcePath, targetPath);
        }
      }

      item.enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disable an item from repository
   */
  async disableItem(item: RepositoryItem): Promise<boolean> {
    try {
      const activeDir = path.join(process.cwd(), `@${item.type}`);
      const targetPath = path.join(activeDir, path.basename(item.path));

      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
      }

      item.enabled = false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove a repository
   */
  async removeRepository(
    repoKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.installedRepos.get(repoKey);
    if (!config) {
      return { success: false, error: `Repository not installed: ${repoKey}` };
    }

    const targetDir = path.join(this.reposDir, config.type);

    try {
      if (await fs.pathExists(targetDir)) {
        await fs.remove(targetDir);
      }
      this.installedRepos.delete(repoKey);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get repository info
   */
  getRepositoryInfo(): Record<string, RepositoryConfig> {
    const info: Record<string, RepositoryConfig> = {};

    for (const [key, config] of this.installedRepos) {
      info[key] = config;
    }

    return info;
  }

  /**
   * Get list of available builtin repositories
   */
  getBuiltinRepositories(): Record<string, RepositoryConfig> {
    return { ...BUILTIN_REPOSITORIES };
  }
}

export function getRepositoryManager(): RepositoryManager {
  return RepositoryManager.getInstance();
}
