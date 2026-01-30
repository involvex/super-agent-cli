import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { AgentsManager } from "../agents/manager";
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

export function createAgentsCommand(): Command {
  const agentsCommand = new Command("agents").description("Manage AI agents");

  agentsCommand
    .command("list")
    .description("List available agents")
    .action(async () => {
      const manager = AgentsManager.getInstance();
      const agents = await manager.listAgents();
      if (agents.length === 0) {
        console.log("No agents found.");
      } else {
        console.log("Available agents:");
        agents.forEach(agent => {
          console.log(`- ${chalk.bold(agent.name)} (${agent.role})`);
          console.log(`  ${chalk.dim(agent.description)}`);
        });
      }
    });

  agentsCommand
    .command("create <name>")
    .description("Create a new agent with AI assistance")
    .option(
      "-d, --description <description>",
      "Description of the agent's role and purpose",
    )
    .action(async (name: string, options) => {
      try {
        const manager = AgentsManager.getInstance();
        const settingsManager = getSettingsManager();

        let description = options.description;
        if (!description) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "description",
              message: "Describe the agent's role and purpose:",
            },
          ]);
          description = answer.description;
        }

        console.log(
          chalk.blue(`Generating agent configuration for '${name}'...`),
        );

        // We need a SuperAgent instance to generate the code
        const apiKey = settingsManager.getApiKey();
        const baseURL = settingsManager.getBaseURL();
        const model = settingsManager.getCurrentModel(); // Or default

        if (!apiKey) {
          console.error(
            chalk.red("API Key not found. Please configure it first."),
          );
          return;
        }

        const agent = new SuperAgent(apiKey, baseURL, model);

        await manager.generateAgent(name, description, agent);
        console.log(chalk.green(`✓ Agent '${name}' created successfully.`));
      } catch (error: any) {
        console.error(chalk.red(`Error creating agent: ${error.message}`));
      }
    });

  agentsCommand
    .command("delete <name>")
    .description("Delete an agent")
    .action(async (name: string) => {
      try {
        const manager = AgentsManager.getInstance();
        await manager.deleteAgent(name);
        console.log(chalk.green(`✓ Agent '${name}' deleted.`));
      } catch (error: any) {
        console.error(chalk.red(`Error deleting agent: ${error.message}`));
      }
    });

  return agentsCommand;
}
