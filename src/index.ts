#!/usr/bin/env node
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { ConfirmationService } from "./utils/confirmation-service";
import { getSettingsManager } from "./utils/settings-manager";
import ChatInterface from "./ui/components/chat-interface";
import { SuperAgent } from "./agent/super-agent";
import { registerCommands } from "./commands";
import { getLogger } from "./utils/logger";
import { program } from "commander";
import pkg from "../package.json";
import * as dotenv from "dotenv";
import { render } from "ink";
import React from "react";

// Load environment variables
dotenv.config();

// Disable default SIGINT handling to let Ink handle Ctrl+C
// We'll handle exit through the input system instead

process.on("SIGTERM", () => {
  // Restore terminal to normal mode before exit
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {
      // Ignore errors when setting raw mode
    }
  }
  console.log("\nGracefully shutting down...");
  process.exit(0);
});

// Handle uncaught exceptions to prevent hanging
process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Ensure user settings are initialized
function ensureUserSettingsDirectory(): void {
  try {
    const manager = getSettingsManager();
    // This will create default settings if they don't exist
    manager.loadUserSettings();
  } catch (error) {
    // Silently ignore errors during setup
  }
}

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
  const manager = getSettingsManager();
  return manager.getApiKey();
}

// Load base URL from user settings if not in environment
function loadBaseURL(): string | undefined {
  const manager = getSettingsManager();
  return manager.getBaseURL();
}

// Save command line settings to user settings file
async function saveCommandLineSettings(
  apiKey?: string,
  baseURL?: string,
): Promise<void> {
  try {
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    const activeProviderId = settings.active_provider;

    // Ensure active provider exists
    if (!settings.providers[activeProviderId]) {
      // Fallback or create if missing (though loadUserSettings should have defaults)
      return;
    }

    if (apiKey) {
      settings.providers[activeProviderId].api_key = apiKey;
      console.log(
        `✅ API key saved for provider '${activeProviderId}' to ~/.super-agent/settings.json`,
      );
    }
    if (baseURL) {
      settings.providers[activeProviderId].base_url = baseURL;
      console.log(
        `✅ Base URL saved for provider '${activeProviderId}' to ~/.super-agent/settings.json`,
      );
    }

    manager.saveUserSettings(settings);
  } catch (error) {
    console.warn(
      "⚠️ Could not save settings to file:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// Load model from user settings if not in environment
function loadModel(): string | undefined {
  // First check environment variables
  let model = process.env.SUPER_AGENT_MODEL;

  if (!model) {
    // Use the unified model loading from settings manager
    try {
      const manager = getSettingsManager();
      model = manager.getCurrentModel();
    } catch (error) {
      // Ignore errors, model will remain undefined
    }
  }

  return model;
}

// Handle commit-and-push command in headless mode
async function handleCommitAndPushHeadless(
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number,
): Promise<void> {
  try {
    const agent = new SuperAgent(apiKey, baseURL, model, maxToolRounds);

    // Configure confirmation service for headless mode (auto-approve all operations)
    const confirmationService = ConfirmationService.getInstance();
    confirmationService.setSessionFlag("allOperations", true);

    console.log("🤖 Processing commit and push...\n");
    console.log("> /commit-and-push\n");

    // First check if there are any changes at all
    const initialStatusResult = await agent.executeBashCommand(
      "git status --porcelain",
    );

    if (!initialStatusResult.success || !initialStatusResult.output?.trim()) {
      console.log("❌ No changes to commit. Working directory is clean.");
      process.exit(1);
    }

    console.log("✅ git status: Changes detected");

    // Add all changes
    const addResult = await agent.executeBashCommand("git add .");

    if (!addResult.success) {
      console.log(
        `❌ git add: ${addResult.error || "Failed to stage changes"}`,
      );
      process.exit(1);
    }

    console.log("✅ git add: Changes staged");

    // Get staged changes for commit message generation
    const diffResult = await agent.executeBashCommand("git diff --cached");

    // Generate commit message using AI
    const commitPrompt = `Generate a concise, professional git commit message for these changes:

Git Status:
${initialStatusResult.output}

Git Diff (staged changes):
${diffResult.output || "No staged changes shown"}

Follow conventional commit format (feat:, fix:, docs:, etc.) and keep it under 72 characters.
Respond with ONLY the commit message, no additional text.`;

    console.log("🤖 Generating commit message...");

    const commitMessageEntries = await agent.processUserMessage(commitPrompt);
    let commitMessage = "";

    // Extract the commit message from the AI response
    for (const entry of commitMessageEntries) {
      if (entry.type === "assistant" && entry.content.trim()) {
        commitMessage = entry.content.trim();
        break;
      }
    }

    if (!commitMessage) {
      console.log("❌ Failed to generate commit message");
      process.exit(1);
    }

    // Clean the commit message
    const cleanCommitMessage = commitMessage.replace(/^["']|["']$/g, "");
    console.log(`✅ Generated commit message: "${cleanCommitMessage}"`);

    // Execute the commit
    const commitCommand = `git commit -m "${cleanCommitMessage}"`;
    const commitResult = await agent.executeBashCommand(commitCommand);

    if (commitResult.success) {
      console.log(
        `✅ git commit: ${
          commitResult.output?.split("\n")[0] || "Commit successful"
        }`,
      );

      // If commit was successful, push to remote
      // First try regular push, if it fails try with upstream setup
      let pushResult = await agent.executeBashCommand("git push");

      if (
        !pushResult.success &&
        pushResult.error?.includes("no upstream branch")
      ) {
        console.log("🔄 Setting upstream and pushing...");
        pushResult = await agent.executeBashCommand("git push -u origin HEAD");
      }

      if (pushResult.success) {
        console.log(
          `✅ git push: ${
            pushResult.output?.split("\n")[0] || "Push successful"
          }`,
        );
      } else {
        console.log(`❌ git push: ${pushResult.error || "Push failed"}`);
        process.exit(1);
      }
    } else {
      console.log(`❌ git commit: ${commitResult.error || "Commit failed"}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error during commit and push:", error.message);
    process.exit(1);
  }
}

// Headless mode processing function
async function processPromptHeadless(
  prompt: string,
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number,
): Promise<void> {
  try {
    const agent = new SuperAgent(apiKey, baseURL, model, maxToolRounds);

    // Configure confirmation service for headless mode (auto-approve all operations)
    const confirmationService = ConfirmationService.getInstance();
    confirmationService.setSessionFlag("allOperations", true);

    // Process the user message
    const chatEntries = await agent.processUserMessage(prompt);

    // Convert chat entries to OpenAI compatible message objects
    const messages: ChatCompletionMessageParam[] = [];

    for (const entry of chatEntries) {
      switch (entry.type) {
        case "user":
          messages.push({
            role: "user",
            content: entry.content,
          });
          break;

        case "assistant":
          const assistantMessage: ChatCompletionMessageParam = {
            role: "assistant",
            content: entry.content,
          };

          // Add tool calls if present
          if (entry.toolCalls && entry.toolCalls.length > 0) {
            assistantMessage.tool_calls = entry.toolCalls.map(toolCall => ({
              id: toolCall.id,
              type: "function",
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            }));
          }

          messages.push(assistantMessage);
          break;

        case "tool_result":
          if (entry.toolCall) {
            messages.push({
              role: "tool",
              tool_call_id: entry.toolCall.id,
              content: entry.content,
            });
          }
          break;
      }
    }

    // Output each message as a separate JSON object
    for (const message of messages) {
      console.log(JSON.stringify(message));
    }
  } catch (error: any) {
    // Output error in OpenAI compatible format
    console.log(
      JSON.stringify({
        role: "assistant",
        content: `Error: ${error.message}`,
      }),
    );
    process.exit(1);
  }
}

program
  .name("super-agent")
  .description(
    "A conversational AI CLI tool powered by Super Agent with text editor capabilities",
  )
  .version(pkg.version)
  .argument("[message...]", "Initial message to send to Super Agent")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option(
    "-k, --api-key <key>",
    "Super Agent API key (or set SUPER_AGENT_API_KEY env var)",
  )
  .option(
    "-u, --base-url <url>",
    "Super Agent API base URL (or set SUPER_AGENT_BASE_URL env var)",
  )
  .option(
    "-m, --model <model>",
    "AI model to use (e.g., GLM-4.7) (or set SUPER_AGENT_MODEL env var)",
  )
  .option(
    "-p, --prompt <prompt>",
    "process a single prompt and exit (headless mode)",
  )
  .option(
    "--max-tool-rounds <rounds>",
    "maximum number of tool execution rounds (default: 400)",
    "400",
  )
  .option("-r, --resume", "resume last session from current working directory")
  .option("--debug", "enable debug logging")
  .action(async (message, options) => {
    if (options.directory) {
      try {
        process.chdir(options.directory);
      } catch (error: any) {
        console.error(
          `Error changing directory to ${options.directory}:`,
          error.message,
        );
        process.exit(1);
      }
    }

    try {
      // Initialize logger with debug mode
      const logger = getLogger();
      if (options.debug) {
        logger.setDebugMode(true);
        logger.debug("Debug mode enabled");
      }

      // Get API key from options, environment, or user settings
      const apiKey = options.apiKey || loadApiKey();
      const baseURL = options.baseUrl || loadBaseURL();
      const model = options.model || loadModel();
      const maxToolRounds = parseInt(options.maxToolRounds) || 400;
      const resumeSession = options.resume || false;

      logger.debug("Options:", {
        apiKey: apiKey ? "***" : undefined,
        baseURL,
        model,
        maxToolRounds,
        resumeSession,
        debug: options.debug,
      });

      if (!apiKey && !options.prompt) {
        console.warn(
          "⚠️  Warning: No API key found. Some features may not work. Use /config or set SUPER_AGENT_API_KEY.",
        );
      } else if (!apiKey && options.prompt) {
        // In headless mode we definitely need the key
        console.error(
          "❌ Error: API key required for headless mode. Set SUPER_AGENT_API_KEY environment variable, use --api-key flag, or configure via interactive mode.",
        );
        process.exit(1);
      }

      // Save API key and base URL to user settings if provided via command line
      if (options.apiKey || options.baseUrl) {
        await saveCommandLineSettings(options.apiKey, options.baseUrl);
      }

      // Headless mode: process prompt and exit
      if (options.prompt) {
        // We know apiKey exists here because of check above
        await processPromptHeadless(
          options.prompt,
          apiKey!,
          baseURL,
          model,
          maxToolRounds,
        );
        return;
      }

      // Interactive mode: launch UI
      // Pass apiKey even if undefined, SuperAgent should handle it or fail gracefully later
      const agent = new SuperAgent(apiKey || "", baseURL, model, maxToolRounds);

      // Display ASCII banner
      const { BANNER } = await import("./utils/banner");
      console.log(BANNER);
      console.log("🤖 Starting Super Agent CLI Conversational Assistant...\n");

      ensureUserSettingsDirectory();

      // Check for updates (non-blocking)
      const { getUpdateChecker } = await import("./utils/update-checker");
      const updateChecker = getUpdateChecker(pkg.version);
      updateChecker
        .checkForUpdates()
        .then(updateInfo => {
          if (updateInfo?.updateAvailable) {
            console.log(
              "\n" + updateChecker.formatUpdateMessage(updateInfo) + "\n",
            );
          }
        })
        .catch(() => {
          // Silently ignore update check errors
        });

      // Support variadic positional arguments for multi-word initial message
      const initialMessage = Array.isArray(message)
        ? message.join(" ")
        : message;

      render(
        React.createElement(ChatInterface, {
          agent,
          initialMessage,
          resumeSession,
          debugMode: options.debug || false,
        }),
      );
    } catch (error: any) {
      console.error("❌ Error initializing Super Agent CLI:", error.message);
      process.exit(1);
    }
  });

// Register modular commands
registerCommands(program);

program.parse();

program.parse();
