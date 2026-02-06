import { getSettingsManager } from "../utils/settings-manager";
import { Command } from "commander";
import inquirer from "inquirer";

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
      const response = await inquirer.prompt<{
        features: string[];
      }>([
        {
          type: "checkbox",
          name: "features",
          message: "Select status bar features to display:",
          choices: [
            {
              name: "Model Name",
              value: "show_model",
              checked: currentConfig.show_model,
            },
            {
              name: "Token Count",
              value: "show_tokens",
              checked: currentConfig.show_tokens,
            },
            {
              name: "Git Status",
              value: "show_git_status",
              checked: currentConfig.show_git_status,
            },
            {
              name: "Memory Usage",
              value: "show_memory",
              checked: currentConfig.show_memory,
            },
            {
              name: "Context Size",
              value: "show_context",
              checked: currentConfig.show_context,
            },
          ],
        },
      ]);

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
