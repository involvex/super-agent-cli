import { getSettingsManager } from "../utils/settings-manager";
import { PluginManager } from "../plugins/manager";
import { Command } from "commander";

export function createPluginsCommand(): Command {
  const pluginsCommand = new Command("plugins")
    .description("Manage plugins for Super Agent CLI")
    .argument("[action]", "Action to perform (list, install, uninstall)")
    .argument("[target]", "Plugin name or path");

  pluginsCommand
    .command("list")
    .description("List installed plugins")
    .action(() => {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const plugins = settings.plugins || [];

      if (plugins.length === 0) {
        console.log("No plugins installed.");
        return;
      }

      console.log("Installed plugins:");
      plugins.forEach(p => console.log(`- ${p}`));
    });

  pluginsCommand
    .command("install <path>")
    .description("Install a plugin from a path, GitHub URL, or registry")
    .action(async (path: string) => {
      try {
        const manager = PluginManager.getInstance();
        console.log(`Installing plugin from: ${path}...`);
        const installedPath = await manager.installPlugin(path);
        console.log(`✅ Plugin installed successfully: ${installedPath}`);
      } catch (error: any) {
        console.error(`❌ Error installing plugin: ${error.message}`);
        process.exit(1);
      }
    });

  pluginsCommand
    .command("uninstall <path>")
    .description("Uninstall a plugin")
    .action(async (path: string) => {
      try {
        const manager = PluginManager.getInstance();
        await manager.removePlugin(path);
        console.log(`✅ Plugin uninstalled: ${path}`);
      } catch (error: any) {
        console.error(`❌ Error uninstalling plugin: ${error.message}`);
        process.exit(1);
      }
    });

  return pluginsCommand;
}
