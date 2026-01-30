import { createServeCommand, createWebCommand } from "./web";
import { createIndexCommand } from "./index-cmd";
import { createPluginsCommand } from "./plugins";
import { createSkillsCommand } from "./skills";
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
  program.addCommand(createIndexCommand());
}
