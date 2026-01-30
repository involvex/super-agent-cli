import { getSettingsManager, PROVIDER_MODELS } from "../utils/settings-manager";
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

export function createProviderCommand(): Command {
  const cmd = new Command("provider").description(
    "Manage LLM provider configuration",
  );

  cmd
    .command("config")
    .description("Interactive provider configuration")
    .action(async () => {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      const providers = Object.keys(settings.providers);

      const { selectedProvider } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedProvider",
          message: "Select a provider to configure:",
          choices: providers,
          default: settings.active_provider,
        },
      ]);

      const currentConfig = settings.providers[selectedProvider];
      if (!currentConfig) {
        console.error(
          chalk.red(`Configuration for ${selectedProvider} not found.`),
        );
        return;
      }
      const models = PROVIDER_MODELS[currentConfig.provider] || [];

      // Ask for API Key
      const { apiKey } = await inquirer.prompt([
        {
          type: "password",
          name: "apiKey",
          message: `Enter API Key for ${selectedProvider} (leave empty to keep current):`,
          mask: "*",
        },
      ]);

      // Ask for Model
      let selectedModel = currentConfig.model;
      if (models.length > 0) {
        const { model } = await inquirer.prompt([
          {
            type: "list",
            name: "model",
            message: "Select default model:",
            choices: [...models, "Custom..."],
            default: currentConfig.model,
          },
        ]);
        selectedModel = model;
      }

      if (selectedModel === "Custom..." || models.length === 0) {
        const { customModel } = await inquirer.prompt([
          {
            type: "input",
            name: "customModel",
            message: "Enter model ID:",
            default: currentConfig.model,
          },
        ]);
        selectedModel = customModel;
      }

      // Ask for Base URL
      const { baseURL } = await inquirer.prompt([
        {
          type: "input",
          name: "baseURL",
          message: "Enter Base URL (optional, leave empty for default):",
          default: currentConfig.base_url,
        },
      ]);

      // Confirm settings
      console.log(chalk.blue("\nNew Configuration:"));
      console.log(`Provider: ${chalk.bold(selectedProvider)}`);
      console.log(`Model: ${chalk.bold(selectedModel)}`);
      // console.log(`API Key: ${apiKey ? "***" : "Unchanged"}`);
      console.log(`Base URL: ${baseURL || "Default"}`);

      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Save these settings?",
          default: true,
        },
      ]);

      if (confirm) {
        // Update settings logic
        const newProviders = { ...settings.providers };
        newProviders[selectedProvider] = {
          ...currentConfig,
          model: selectedModel,
          base_url: baseURL || currentConfig.base_url, // keep existing if empty? typically explicit empty means default
        };

        if (apiKey) {
          newProviders[selectedProvider].api_key = apiKey;
        }

        if (baseURL !== undefined && baseURL !== currentConfig.base_url) {
          newProviders[selectedProvider].base_url = baseURL;
        }

        manager.updateUserSetting("providers", newProviders);

        // Also ask to set as active?
        if (settings.active_provider !== selectedProvider) {
          const { makeActive } = await inquirer.prompt([
            {
              type: "confirm",
              name: "makeActive",
              message: `Set ${selectedProvider} as active provider?`,
              default: true,
            },
          ]);

          if (makeActive) {
            manager.updateUserSetting("active_provider", selectedProvider);
            console.log(
              chalk.green(
                `\n✅ Settings saved and ${selectedProvider} is now active.`,
              ),
            );
          } else {
            console.log(chalk.green("\n✅ Settings saved."));
          }
        } else {
          console.log(chalk.green("\n✅ Settings saved."));
        }
      } else {
        console.log(chalk.yellow("Configuration cancelled."));
      }
    });

  return cmd;
}
