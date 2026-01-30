import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { SkillsManager } from "../skills/manager";
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

export function createSkillsCommand(): Command {
  const skillsCommand = new Command("skills").description("Manage AI skills");

  skillsCommand
    .command("list")
    .description("List available skills")
    .action(async () => {
      const manager = SkillsManager.getInstance();
      const skills = await manager.listSkills();
      if (skills.length === 0) {
        console.log("No skills found.");
      } else {
        console.log("Available skills:");
        skills.forEach(skill => console.log(`- ${skill}`));
      }
    });

  skillsCommand
    .command("create <name>")
    .description("Create a new skill with AI assistance")
    .option("-d, --description <description>", "Description of the skill")
    .action(async (name: string, options) => {
      try {
        const manager = SkillsManager.getInstance();
        const settingsManager = getSettingsManager();

        let description = options.description;
        if (!description) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "description",
              message: "Describe what this skill should do:",
            },
          ]);
          description = answer.description;
        }

        console.log(
          chalk.blue(
            `Generating skill '${name}' based on description: "${description}"...`,
          ),
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

        await manager.createSkill(name, description, agent);
        console.log(chalk.green(`✓ Skill '${name}' created successfully.`));
      } catch (error: any) {
        console.error(chalk.red(`Error creating skill: ${error.message}`));
      }
    });

  skillsCommand
    .command("delete <name>")
    .description("Delete a skill")
    .action(async (name: string) => {
      try {
        const manager = SkillsManager.getInstance();
        await manager.deleteSkill(name);
        console.log(chalk.green(`✓ Skill '${name}' deleted.`));
      } catch (error: any) {
        console.error(chalk.red(`Error deleting skill: ${error.message}`));
      }
    });

  return skillsCommand;
}
