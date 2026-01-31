import { createServeCommand, createWebCommand } from "./web";
import { createRepositoryCommand } from "./repository";
import { createProviderCommand } from "./provider";
import { createIndexCommand } from "./index-cmd";
import { createPluginsCommand } from "./plugins";
import { createSkillsCommand } from "./skills";
import { createImportCommand } from "./import";
import { createAgentsCommand } from "./agents";
import { createMCPCommand } from "./mcp";
import { createGitCommand } from "./git";
import { Command } from "commander";

export function registerCommands(program: Command) {
  // Register all commands
  program.addCommand(createMCPCommand());
  program.addCommand(createPluginsCommand());
  program.addCommand(createGitCommand());
  program.addCommand(createWebCommand());
  program.addCommand(createServeCommand());
  program.addCommand(createSkillsCommand());
  program.addCommand(createAgentsCommand());
  program.addCommand(createImportCommand());
  program.addCommand(createProviderCommand());
  program.addCommand(createIndexCommand());
  program.addCommand(createRepositoryCommand());
}
