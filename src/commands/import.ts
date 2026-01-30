import { getSettingsManager } from "../utils/settings-manager";
import { resolveSourcePath } from "../utils/file-utils";
import { SkillsManager } from "../skills/manager";
import { AgentsManager } from "../agents/manager";
import { Command } from "commander";
import fs from "fs-extra";
import chalk from "chalk";
import path from "path";

export function createImportCommand(): Command {
  const cmd = new Command("import").description(
    "Import resources from other AI assistants",
  );

  cmd
    .command("agents <source>")
    .description("Import agents from source (gemini, claude, kilo)")
    .action(async source => {
      const sourcePath = resolveSourcePath(source);
      const agentsDir = path.join(sourcePath, "agents");

      if (!(await fs.pathExists(agentsDir))) {
        console.error(chalk.red(`Agents directory not found at ${agentsDir}`));
        return;
      }

      const files = await fs.readdir(agentsDir);
      const manager = AgentsManager.getInstance();
      let count = 0;

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const content = await fs.readJson(path.join(agentsDir, file));
            // Transform logic if needed, for new assume compatible structure or minimal mapping
            // Mapping check:
            const agentConfig = {
              name: content.name || path.parse(file).name,
              role: content.role || "Assistant",
              description: content.description || "Imported agent",
              model: content.model,
              tools: content.tools,
              temperature: content.temperature,
              systemPrompt:
                content.systemPrompt || content.system_prompt || content.prompt, // fallback
            };

            await manager.createAgent(agentConfig);
            console.log(chalk.green(`Imported agent: ${agentConfig.name}`));
            count++;
          } catch (error: any) {
            console.warn(
              chalk.yellow(`Failed to import ${file}: ${error.message}`),
            );
          }
        }
      }
      console.log(chalk.bold(`Imported ${count} agents.`));
    });

  cmd
    .command("skills <source>")
    .description("Import skills from source (gemini, claude, kilo)")
    .action(async source => {
      const sourcePath = resolveSourcePath(source);
      const skillsDir = path.join(sourcePath, "skills");

      if (!(await fs.pathExists(skillsDir))) {
        console.error(chalk.red(`Skills directory not found at ${skillsDir}`));
        return;
      }

      const files = await fs.readdir(skillsDir);
      const manager = SkillsManager.getInstance();
      let count = 0;

      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          try {
            const content = await fs.readFile(
              path.join(skillsDir, file),
              "utf-8",
            );
            // Basic validation? simpler to just copy
            const name = path.parse(file).name;
            await manager.saveSkill(name, content);
            console.log(chalk.green(`Imported skill: ${name}`));
            count++;
          } catch (error: any) {
            console.warn(
              chalk.yellow(`Failed to import ${file}: ${error.message}`),
            );
          }
        }
      }
      console.log(chalk.bold(`Imported ${count} skills.`));
    });

  cmd
    .command("hooks <source>")
    .description("Import hooks from source settings")
    .action(async source => {
      const sourcePath = resolveSourcePath(source);
      const settingsFile =
        source.toLowerCase() === "claude"
          ? "settings.local.json"
          : "settings.json";

      const fullPath = path.join(sourcePath, settingsFile);

      if (!(await fs.pathExists(fullPath))) {
        console.error(chalk.red(`Settings file not found at ${fullPath}`));
        return;
      }

      try {
        const settings = await fs.readJson(fullPath);
        if (settings.hooks) {
          const manager = getSettingsManager();
          const currentHooks = manager.getUserSetting("hooks") || {};
          const mergedHooks = { ...currentHooks, ...settings.hooks };

          manager.updateUserSetting("hooks", mergedHooks);
          console.log(
            chalk.green(
              `Imported ${Object.keys(settings.hooks).length} hooks.`,
            ),
          );
        } else {
          console.log(chalk.yellow("No hooks found in settings file."));
        }
      } catch (error: any) {
        console.error(chalk.red(`Failed to import hooks: ${error.message}`));
      }
    });

  return cmd;
}
