import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { WebServer } from "../web/server";
import { Command } from "commander";
import chalk from "chalk";

export function createWebCommand(): Command {
  const webCommand = new Command("web")
    .description("Start the web interface")
    .option("-p, --port <number>", "Port to run server on", "3000")
    .option("--no-browser", "Do not open browser automatically")
    .action(async options => {
      const port = parseInt(options.port);
      const settingsManager = getSettingsManager();

      const apiKey = settingsManager.getApiKey();
      const baseURL =
        settingsManager.getBaseURL() || "https://api.openai.com/v1"; // safe default
      const model = settingsManager.getCurrentModel();

      if (!apiKey) {
        console.error(
          chalk.red("API Key not found. Please configure it first."),
        );
        process.exit(1);
      }

      console.log(chalk.blue(`Starting web server on port ${port}...`));

      const agent = new SuperAgent(apiKey, baseURL, model);
      const server = new WebServer({
        port,
        agent,
        openBrowser: options.browser,
      });

      try {
        await server.start();
        if (options.browser) {
          await server.openBrowser();
        }

        // Keep process alive
        process.on("SIGINT", () => {
          console.log(chalk.yellow("\nStopping server..."));
          server.stop();
          process.exit(0);
        });
      } catch (error: any) {
        console.error(chalk.red(`Failed to start server: ${error.message}`));
        process.exit(1);
      }
    });

  return webCommand;
}

export function createServeCommand(): Command {
  const serveCommand = new Command("serve")
    .description("Start the web interface and CLI together")
    .option("-p, --port <number>", "Port to run server on", "3000")
    .action(async options => {
      // This is a placeholder for a more complex dual-mode
      // For now, it aliases 'web' but might be extended to run background tasks
      console.log(
        chalk.yellow(
          "Serve mode is currently an alias for 'web' mode with background persistence capabilities.",
        ),
      );
      // Reuse web logic or just call it?
      // Let's reimplement basics for now to avoid circular dependency or complexity

      const port = parseInt(options.port);
      const settingsManager = getSettingsManager();
      const apiKey = settingsManager.getApiKey();

      if (!apiKey) {
        console.error(chalk.red("API Key not found."));
        process.exit(1);
      }

      const agent = new SuperAgent(
        apiKey,
        settingsManager.getBaseURL() || "",
        settingsManager.getCurrentModel(),
      );
      const server = new WebServer({ port, agent, openBrowser: true });

      await server.start();
      await server.openBrowser();
    });

  return serveCommand;
}
