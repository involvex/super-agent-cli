import { getSettingsManager } from "../utils/settings-manager";
import { Command } from "commander";
import { prompt } from "enquirer";

export function createStatusBarCommand(): Command {
  const command = new Command("statusbar");

  command.description("Configure status bar settings").action(async () => {
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    const currentConfig = settings.ui.statusbar_config || {
      show_model: true,
      show_tokens: true,
      show_git_status: true,
      show_memory: false,
      show_context: false,
    };

    try {
      const response = await prompt<{
        features: string[];
      }>({
        type: "multiselect",
        name: "features",
        message: "Select status bar features to display:",
        choices: [
          {
            name: "show_model",
            message: "Model Name",
            value: "show_model",
            enabled: currentConfig.show_model,
          },
          {
            name: "show_tokens",
            message: "Token Count",
            value: "show_tokens",
            enabled: currentConfig.show_tokens,
          },
          {
            name: "show_git_status",
            message: "Git Status",
            value: "show_git_status",
            enabled: currentConfig.show_git_status,
          },
          {
            name: "show_memory",
            message: "Memory Usage",
            value: "show_memory",
            enabled: currentConfig.show_memory,
          },
          {
            name: "show_context",
            message: "Context Size",
            value: "show_context",
            enabled: currentConfig.show_context,
          },
        ],
      });

      // Convert array of selected features back to config object
      const newConfig = {
        show_model: response.features.includes("show_model"),
        show_tokens: response.features.includes("show_tokens"),
        show_git_status: response.features.includes("show_git_status"),
        show_memory: response.features.includes("show_memory"),
        show_context: response.features.includes("show_context"),
      };

      manager.saveUserSettings({
        ui: {
          ...settings.ui,
          statusbar_config: newConfig,
        },
      });

      console.log("✓ Status bar configuration updated");
    } catch (error) {
      console.error("Failed to update status bar configuration:", error);
    }
  });

  return command;
}
