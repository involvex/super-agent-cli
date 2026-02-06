import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { runSafeCommand } from "../utils/exec";
import { SuperAgentPlugin } from "./types";
import { SuperAgentTool } from "../types";
import execAsync from "node:process";
import * as path from "path";
import fs from "fs-extra";

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, SuperAgentPlugin> = new Map();
  private pluginDirectory: string;

  private constructor() {
    const settingsManager = getSettingsManager();
    this.pluginDirectory = path.join(
      settingsManager.getStorageDirectory(),
      "plugins",
    );
    fs.ensureDirSync(this.pluginDirectory);
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  public async loadPlugins(agent: SuperAgent): Promise<void> {
    const settingsManager = getSettingsManager();
    const userSettings = settingsManager.loadUserSettings();
    const enabledPlugins = userSettings.plugins || [];

    for (const pluginPath of enabledPlugins) {
      try {
        await this.loadPlugin(pluginPath, agent);
      } catch (error) {
        console.warn(`Failed to load plugin from ${pluginPath}:`, error);
      }
    }
  }

  public async loadPlugin(
    pluginPath: string,
    agent: SuperAgent,
  ): Promise<void> {
    // Determine if it's a local file or a module
    let resolvedPath = pluginPath;
    if (
      pluginPath.startsWith(".") ||
      pluginPath.startsWith("/") ||
      pluginPath.match(/^[a-zA-Z]:/)
    ) {
      resolvedPath = path.resolve(pluginPath);
    }

    try {
      // Dynamic import
      const module = await import(resolvedPath);
      const plugin: SuperAgentPlugin = module.default || module.plugin;

      if (!plugin || !plugin.name) {
        throw new Error("Invalid plugin: missing export or name");
      }

      if (this.plugins.has(plugin.name)) {
        console.warn(`Plugin ${plugin.name} is already loaded.`);
        return;
      }

      // Initialize
      if (plugin.onInit) {
        await plugin.onInit({ agent, config: {} });
      }

      this.plugins.set(plugin.name, plugin);
      // console.log(`Loaded plugin: ${plugin.name}`);
    } catch (error) {
      throw new Error(`Error importing plugin ${pluginPath}: ${error}`);
    }
  }

  public async installPlugin(pluginPath: string): Promise<string> {
    let resolvedPath = pluginPath;

    // Check if it's a GitHub URL
    if (this.isGitHubUrl(pluginPath)) {
      console.log(`📦 Cloning from GitHub: ${pluginPath}...`);
      resolvedPath = await this.cloneGitHubRepo(pluginPath);
      console.log(`✅ Cloned to: ${resolvedPath}`);
    }
    // Check if it's a local directory
    else if (await this.isDirectory(pluginPath)) {
      console.log(`📁 Installing from local directory: ${pluginPath}...`);
      resolvedPath = await this.installFromDirectory(pluginPath);
      console.log(`✅ Installed from: ${pluginPath}`);
    }
    // Otherwise treat as file path
    else {
      resolvedPath = path.resolve(pluginPath);
      if (!(await fs.pathExists(resolvedPath))) {
        throw new Error(`Plugin file not found: ${resolvedPath}`);
      }
    }

    // Add to settings
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    const plugins = settings.plugins || [];

    if (!plugins.includes(resolvedPath)) {
      plugins.push(resolvedPath);
      manager.updateUserSetting("plugins", plugins);
      return resolvedPath;
    }
    return resolvedPath;
  }

  private isGitHubUrl(url: string): boolean {
    return (
      url.startsWith("https://github.com/") ||
      url.startsWith("git@github.com:") ||
      url.match(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/) !== null
    ); // owner/repo format
  }

  private async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async cloneGitHubRepo(repoUrl: string): Promise<string> {
    // Normalize GitHub URL
    let gitUrl = repoUrl;
    if (repoUrl.match(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/)) {
      gitUrl = `https://github.com/${repoUrl}.git`;
    } else if (!repoUrl.endsWith(".git")) {
      gitUrl = `${repoUrl}.git`;
    }

    // Extract repo name
    const repoName = path.basename(gitUrl, ".git");
    const targetDir = path.join(this.pluginDirectory, repoName);

    // Check if already cloned
    if (await fs.pathExists(targetDir)) {
      console.log(
        `Repository already cloned at ${targetDir}. Pulling latest...`,
      );
      try {
        await runSafeCommand("git", ["pull"], {
          cwd: targetDir,
        });
      } catch (error) {
        console.warn(`Failed to pull updates: ${error}`);
      }
    } else {
      // Clone the repository
      await runSafeCommand("git", ["clone", gitUrl, targetDir]);
    }

    // Try to build if package.json exists
    const packageJsonPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      console.log("📦 Installing dependencies...");
      try {
        // Detect package manager
        const hasBun = await fs.pathExists(path.join(targetDir, "bun.lockb"));
        const hasYarn = await fs.pathExists(path.join(targetDir, "yarn.lock"));

        const installCmd = hasBun ? "bun" : hasYarn ? "yarn" : "npm";
        const installArgs = ["install"];
        await runSafeCommand(installCmd, installArgs, {
          cwd: targetDir,
        });

        console.log("🔨 Building plugin...");
        const buildCmd = hasBun ? "bun" : hasYarn ? "yarn" : "npm";
        const buildArgs = ["run", "build"];
        await runSafeCommand(buildCmd, buildArgs, {
          cwd: targetDir,
        });
      } catch (error: any) {
        console.warn(`Build failed: ${error.message}`);
      }
    }

    // Return path to built plugin or src/index.ts
    const distPath = path.join(targetDir, "dist", "index.js");
    if (await fs.pathExists(distPath)) {
      return distPath;
    }

    const srcPath = path.join(targetDir, "src", "index.ts");
    if (await fs.pathExists(srcPath)) {
      return srcPath;
    }

    return path.join(targetDir, "index.js");
  }

  private async installFromDirectory(dirPath: string): Promise<string> {
    const absolutePath = path.resolve(dirPath);

    // Check for package.json and build if needed
    const packageJsonPath = path.join(absolutePath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      console.log("📦 Installing dependencies...");
      try {
        const hasBun = await fs.pathExists(
          path.join(absolutePath, "bun.lockb"),
        );
        const hasYarn = await fs.pathExists(
          path.join(absolutePath, "yarn.lock"),
        );

        const installCmd = hasBun ? "bun" : hasYarn ? "yarn" : "npm";
        const installArgs = ["install"];
        await runSafeCommand(installCmd, installArgs, {
          cwd: absolutePath,
        });

        console.log("🔨 Building plugin...");
        const buildCmd = hasBun ? "bun" : hasYarn ? "yarn" : "npm";
        const buildArgs = ["run", "build"];
        await runSafeCommand(buildCmd, buildArgs, {
          cwd: absolutePath,
        });
      } catch (error: any) {
        console.warn(`Build failed: ${error.message}`);
      }
    }

    // Return path to built plugin
    const distPath = path.join(absolutePath, "dist", "index.js");
    if (await fs.pathExists(distPath)) {
      return distPath;
    }

    const srcPath = path.join(absolutePath, "src", "index.ts");
    if (await fs.pathExists(srcPath)) {
      return srcPath;
    }

    return path.join(absolutePath, "index.js");
  }

  public async removePlugin(pluginOrPath: string): Promise<void> {
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    let plugins = settings.plugins || [];

    // Check if it's a name (unload active)
    if (this.plugins.has(pluginOrPath)) {
      const plugin = this.plugins.get(pluginOrPath);
      if (plugin?.onShutdown) {
        await plugin.onShutdown();
      }
      this.plugins.delete(pluginOrPath);
      // Try to guess path removal - difficult if multiple paths map to one name
      // For MVP, assume argument matches config entry
    }

    plugins = plugins.filter(p => p !== pluginOrPath);
    manager.updateUserSetting("plugins", plugins);
  }

  public getTools(): SuperAgentTool[] {
    const tools: SuperAgentTool[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.tools) {
        tools.push(...plugin.tools);
      }
    }
    return tools;
  }

  public getPlugins(): SuperAgentPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export function getPluginManager(): PluginManager {
  return PluginManager.getInstance();
}
