import {
  getRepositoryManager,
  BUILTIN_REPOSITORIES,
  RepositoryItem,
} from "../plugins/repository-manager";
import { Command } from "commander";
import chalk from "chalk";

/**
 * Create the Commander.js command for repository management
 */
export function createRepositoryCommand(): Command {
  const cmd = new Command("repo");

  cmd.description("Manage plugin repositories").action(async () => {
    await repositoryCommands.listInstalled();
  });

  cmd
    .command("list")
    .description("List installed repositories and available items")
    .action(async () => {
      await repositoryCommands.listInstalled();
    });

  cmd
    .command("available")
    .description("List all available builtin repositories")
    .action(async () => {
      await repositoryCommands.listAvailable();
    });

  cmd
    .command("install <type>")
    .description("Install a plugin repository (agents, skills, hooks, mcp)")
    .action(async (type: string) => {
      await repositoryCommands.install(type);
    });

  cmd
    .command("update")
    .description("Update all installed repositories")
    .action(async () => {
      await repositoryCommands.update();
    });

  cmd
    .command("enable <name> [type]")
    .description("Enable an item from a repository")
    .action(async (name: string, type?: string) => {
      await repositoryCommands.enable(name, type);
    });

  cmd
    .command("disable <name> [type]")
    .description("Disable an item from a repository")
    .action(async (name: string, type?: string) => {
      await repositoryCommands.disable(name, type);
    });

  cmd
    .command("remove <type>")
    .description("Remove an installed repository")
    .action(async (type: string) => {
      await repositoryCommands.remove(type);
    });

  return cmd;
}

export const repositoryCommands = {
  /**
   * List all available builtin repositories
   */
  async listAvailable(): Promise<void> {
    console.log(chalk.bold("\n📦 Available Plugin Repositories:\n"));
    for (const [key, config] of Object.entries(BUILTIN_REPOSITORIES)) {
      console.log(`  ${chalk.cyan(key)}: ${config.type}`);
      console.log(`    URL: ${chalk.gray(config.url)}`);
      console.log(`    Branch: ${chalk.gray(config.branch || "main")}\n`);
    }
  },

  /**
   * List installed repositories and their items
   */
  async listInstalled(): Promise<void> {
    const manager = getRepositoryManager();
    const repoInfo = manager.getRepositoryInfo();
    const items = await manager.listAvailableItems();

    console.log(chalk.bold("\n📦 Installed Repositories:\n"));

    if (Object.keys(repoInfo).length === 0) {
      console.log(chalk.gray("  No repositories installed."));
      console.log(
        chalk.gray("  Use '/repo install <type>' to install a repository.\n"),
      );
      return;
    }

    for (const [key, config] of Object.entries(repoInfo)) {
      console.log(`  ${chalk.cyan(key)}: ${config.type}`);
      console.log(`    URL: ${chalk.gray(config.url)}\n`);
    }

    if (items.length > 0) {
      console.log(chalk.bold("\n📋 Available Items:\n"));
      for (const item of items) {
        const statusIcon = item.enabled ? chalk.green("✓") : chalk.gray("○");
        console.log(
          `  ${statusIcon} ${chalk.yellow(item.name)} (${chalk.gray(item.type)})`,
        );
        if (item.description) {
          console.log(`      ${chalk.gray(item.description)}`);
        }
      }
    }
  },

  /**
   * Install a repository
   */
  async install(repoType: string): Promise<void> {
    const manager = getRepositoryManager();

    // Check if it's a builtin repo
    if (!BUILTIN_REPOSITORIES[repoType]) {
      console.error(chalk.red(`❌ Unknown repository type: ${repoType}`));
      console.log(chalk.gray("\nAvailable types:"));
      for (const key of Object.keys(BUILTIN_REPOSITORIES)) {
        console.log(chalk.gray(`  - ${key}`));
      }
      return;
    }

    console.log(chalk.bold(`\n📥 Installing ${repoType} repository...`));
    const result = await manager.installRepository(repoType);

    if (result.success) {
      console.log(
        chalk.green(`✅ Installed ${repoType} repository at ${result.path}`),
      );
    } else {
      console.error(chalk.red(`❌ Failed to install: ${result.error}`));
    }
  },

  /**
   * Update all installed repositories
   */
  async update(): Promise<void> {
    const manager = getRepositoryManager();
    console.log(chalk.bold("\n🔄 Updating all repositories..."));
    const result = await manager.updateRepositories();

    if (result.updated.length > 0) {
      console.log(chalk.green(`✅ Updated: ${result.updated.join(", ")}`));
    }

    if (result.errors.length > 0) {
      console.error(chalk.red(`❌ Errors:`));
      for (const error of result.errors) {
        console.error(chalk.red(`  - ${error}`));
      }
    }

    if (result.updated.length === 0 && result.errors.length === 0) {
      console.log(chalk.gray("  No repositories installed."));
    }
  },

  /**
   * Enable an item from a repository
   */
  async enable(itemName: string, itemType?: string): Promise<void> {
    const manager = getRepositoryManager();
    const items = await manager.listAvailableItems();

    // Find the item
    let item: RepositoryItem | undefined;
    if (itemType) {
      item = items.find(i => i.name === itemName && i.type === itemType);
    } else {
      item = items.find(i => i.name === itemName);
    }

    if (!item) {
      console.error(chalk.red(`❌ Item not found: ${itemName}`));
      if (itemType) {
        console.log(chalk.gray(`\nTry '/repo list' to see available items.`));
      } else {
        console.log(
          chalk.gray(
            `\nMultiple items may have this name. Specify type: '/repo enable ${itemName} <type>'`,
          ),
        );
      }
      return;
    }

    if (item.enabled) {
      console.log(chalk.yellow(`⚠️  Item '${itemName}' is already enabled.`));
      return;
    }

    const success = await manager.enableItem(item);
    if (success) {
      console.log(chalk.green(`✅ Enabled ${itemName}`));
    } else {
      console.error(chalk.red(`❌ Failed to enable ${itemName}`));
    }
  },

  /**
   * Disable an item from a repository
   */
  async disable(itemName: string, itemType?: string): Promise<void> {
    const manager = getRepositoryManager();
    const items = await manager.listAvailableItems();

    // Find the item
    let item: RepositoryItem | undefined;
    if (itemType) {
      item = items.find(i => i.name === itemName && i.type === itemType);
    } else {
      item = items.find(i => i.name === itemName);
    }

    if (!item) {
      console.error(chalk.red(`❌ Item not found: ${itemName}`));
      return;
    }

    if (!item.enabled) {
      console.log(chalk.yellow(`⚠️  Item '${itemName}' is already disabled.`));
      return;
    }

    const success = await manager.disableItem(item);
    if (success) {
      console.log(chalk.green(`✅ Disabled ${itemName}`));
    } else {
      console.error(chalk.red(`❌ Failed to disable ${itemName}`));
    }
  },

  /**
   * Remove a repository
   */
  async remove(repoType: string): Promise<void> {
    const manager = getRepositoryManager();
    console.log(chalk.bold(`\n🗑️  Removing ${repoType} repository...`));
    const result = await manager.removeRepository(repoType);

    if (result.success) {
      console.log(chalk.green(`✅ Removed ${repoType} repository`));
    } else {
      console.error(chalk.red(`❌ Failed to remove: ${result.error}`));
    }
  },
};

/**
 * Handle repository commands from the CLI
 */
export async function handleRepositoryCommand(input: string): Promise<boolean> {
  const trimmedInput = input.trim();

  if (trimmedInput === "/repo" || trimmedInput === "/repo list") {
    await repositoryCommands.listInstalled();
    return true;
  }

  if (trimmedInput === "/repo available") {
    await repositoryCommands.listAvailable();
    return true;
  }

  if (trimmedInput.startsWith("/repo install ")) {
    const repoType = trimmedInput.slice("/repo install ".length).trim();
    if (repoType) {
      await repositoryCommands.install(repoType);
    }
    return true;
  }

  if (trimmedInput === "/repo update") {
    await repositoryCommands.update();
    return true;
  }

  if (trimmedInput.startsWith("/repo enable ")) {
    const args = trimmedInput.slice("/repo enable ".length).trim().split(" ");
    const itemName = args[0];
    const itemType = args[1];
    if (itemName) {
      await repositoryCommands.enable(itemName, itemType);
    }
    return true;
  }

  if (trimmedInput.startsWith("/repo disable ")) {
    const args = trimmedInput.slice("/repo disable ".length).trim().split(" ");
    const itemName = args[0];
    const itemType = args[1];
    if (itemName) {
      await repositoryCommands.disable(itemName, itemType);
    }
    return true;
  }

  if (trimmedInput.startsWith("/repo remove ")) {
    const repoType = trimmedInput.slice("/repo remove ".length).trim();
    if (repoType) {
      await repositoryCommands.remove(repoType);
    }
    return true;
  }

  return false;
}
