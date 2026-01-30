import { ConfirmationService } from "../utils/confirmation-service";
import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import { Command } from "commander";

async function loadApiKey(): Promise<string | undefined> {
  const manager = getSettingsManager();
  return manager.getApiKey();
}

async function loadBaseURL(): Promise<string | undefined> {
  const manager = getSettingsManager();
  return manager.getBaseURL();
}

async function loadModel(): Promise<string | undefined> {
  const manager = getSettingsManager();
  // Try environment variable first, then settings
  return process.env.SUPER_AGENT_MODEL || manager.getCurrentModel();
}

async function saveCommandLineSettings(
  apiKey?: string,
  baseURL?: string,
): Promise<void> {
  if (!apiKey && !baseURL) {
    return;
  }

  const manager = getSettingsManager();
  const settings = manager.loadUserSettings();
  const activeProviderId = settings.active_provider;

  if (settings.providers[activeProviderId]) {
    if (apiKey) {
      settings.providers[activeProviderId].api_key = apiKey;
    }
    if (baseURL) {
      settings.providers[activeProviderId].base_url = baseURL;
    }
    manager.saveUserSettings(settings);
  }
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

export function createGitCommand(): Command {
  const gitCommand = new Command("git").description(
    "Git operations with AI assistance",
  );

  gitCommand
    .command("commit-and-push")
    .description("Generate AI commit message and push to remote")
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
      "--max-tool-rounds <rounds>",
      "maximum number of tool execution rounds (default: 400)",
      "400",
    )
    .action(async options => {
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
        // Get API key from options, environment, or user settings
        const apiKey = options.apiKey || (await loadApiKey());
        const baseURL = options.baseUrl || (await loadBaseURL());
        const model = options.model || (await loadModel());
        const maxToolRounds = parseInt(options.maxToolRounds) || 400;

        if (!apiKey) {
          console.error(
            "❌ Error: API key required for git operations. Set SUPER_AGENT_API_KEY environment variable.",
          );
          process.exit(1);
        }

        // Save API key and base URL to user settings if provided via command line
        if (options.apiKey || options.baseUrl) {
          await saveCommandLineSettings(options.apiKey, options.baseUrl);
        }

        await handleCommitAndPushHeadless(
          apiKey!,
          baseURL,
          model,
          maxToolRounds,
        );
      } catch (error: any) {
        console.error("❌ Error during git commit-and-push:", error.message);
        process.exit(1);
      }
    });

  return gitCommand;
}
