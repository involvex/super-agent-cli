import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { SuperAgentTool } from "../core/client";
import { SuperAgentPlugin } from "./types";
import * as fs from "fs-extra";
import * as path from "path";

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
    // For now, "install" just means enabling it in settings
    // In future, could copy files or npm install

    // Verify it loads first
    // We can't fully verify without an agent instance easily here,
    // but we can try basic import

    // Add to settings
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    const plugins = settings.plugins || [];

    if (!plugins.includes(pluginPath)) {
      plugins.push(pluginPath);
      manager.updateUserSetting("plugins", plugins);
      return pluginPath;
    }
    return pluginPath;
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
