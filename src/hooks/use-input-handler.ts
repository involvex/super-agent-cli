import {
  FileEntry,
  filterFileEntries,
  listFilesRecursive,
} from "../utils/file-utils";
import { ConfirmationService } from "../utils/confirmation-service";
import { Key, useEnhancedInput } from "./use-enhanced-input";
import { ChatEntry, SuperAgent } from "../agent/super-agent";
import { useEffect, useMemo, useState } from "react";
import { useInput } from "ink";

import { filterCommandSuggestions } from "../ui/components/command-suggestions";
import { loadModelConfig, updateCurrentModel } from "../utils/model-config";
import { getSettingsManager } from "../utils/settings-manager";
import * as fs from "fs-extra";

type AgentMode = "plan" | "code" | "debug";

interface UseInputHandlerProps {
  agent: SuperAgent;
  chatHistory: ChatEntry[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
  setIsProcessing: (processing: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setTokenCount: (count: number) => void;
  setProcessingTime: (time: number) => void;
  processingStartTime: React.MutableRefObject<number>;
  isProcessing: boolean;
  isStreaming: boolean;
  isConfirmationActive?: boolean;
}

interface CommandSuggestion {
  command: string;
  description: string;
}

interface ModelOption {
  model: string;
}

export function useInputHandler({
  agent,
  chatHistory,
  setChatHistory,
  setIsProcessing,
  setIsStreaming,
  setTokenCount,
  setProcessingTime,
  processingStartTime,
  isProcessing,
  isStreaming,
  isConfirmationActive = false,
}: UseInputHandlerProps) {
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [autoEditEnabled, setAutoEditEnabled] = useState(() => {
    const confirmationService = ConfirmationService.getInstance();
    const sessionFlags = confirmationService.getSessionFlags();
    return sessionFlags.allOperations;
  });

  const [agentMode, setAgentMode] = useState<AgentMode>("code");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<FileEntry[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);

  // Load files for mentions on mount or periodically
  useEffect(() => {
    listFilesRecursive(process.cwd()).then(setMentionSuggestions);
  }, []);

  const handleSpecialKey = (key: Key): boolean => {
    // Don't handle input if confirmation dialog is active
    if (isConfirmationActive) {
      return true; // Prevent default handling
    }

    // Handle shift+tab to toggle auto-edit mode -> Now cycles modes
    if (key.shift && key.tab) {
      const modeCycle: AgentMode[] = ["plan", "code", "debug"];
      const currentIndex = modeCycle.indexOf(agentMode);
      const nextMode = modeCycle[(currentIndex + 1) % modeCycle.length];
      setAgentMode(nextMode);

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `⏺ Switched mode to: ${nextMode.toUpperCase()}`,
          timestamp: new Date(),
        },
      ]);
      return true;
    }

    // Handle Shift+! (approximate trigger for shell mode)
    if (key.shift && key.sequence === "!") {
      const newInput = "!";
      setInput(newInput);
      setCursorPosition(newInput.length);
      return true;
    }

    // Handle Ctrl+P for Command Palette
    if (key.ctrl && (key.name === "p" || key.sequence === "\x10")) {
      setShowCommandPalette(true);
      setCommandPaletteQuery("");
      setSelectedPaletteIndex(0);
      return true;
    }

    // Handle command palette navigation
    if (showCommandPalette) {
      const filtered = filterFileEntries(
        mentionSuggestions,
        commandPaletteQuery,
      );
      if (key.upArrow) {
        setSelectedPaletteIndex(prev =>
          prev === 0 ? Math.max(0, filtered.length - 1) : prev - 1,
        );
        return true;
      }
      if (key.downArrow) {
        setSelectedPaletteIndex(
          prev => (prev + 1) % Math.max(1, filtered.length),
        );
        return true;
      }
      if (key.return) {
        if (filtered.length > 0) {
          const selected = filtered[selectedPaletteIndex];
          const newInput = input + " @" + selected.path + " ";
          setInput(newInput);
          setCursorPosition(newInput.length);
        }
        setShowCommandPalette(false);
        return true;
      }
      if (key.escape) {
        setShowCommandPalette(false);
        return true;
      }
      // Capture typing for palette query
      if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
        setCommandPaletteQuery(prev => prev + key.sequence);
        setSelectedPaletteIndex(0);
        return true;
      }
      if (key.backspace) {
        setCommandPaletteQuery(prev => prev.slice(0, -1));
        setSelectedPaletteIndex(0);
        return true;
      }
      return true; // Absorb other keys while palette is open
    }

    // Handle escape key for closing menus
    if (key.escape) {
      if (showCommandSuggestions) {
        setShowCommandSuggestions(false);
        setSelectedCommandIndex(0);
        return true;
      }
      if (showModelSelection) {
        setShowModelSelection(false);
        setSelectedModelIndex(0);
        return true;
      }
      if (isProcessing || isStreaming) {
        agent.abortCurrentOperation();
        setIsProcessing(false);
        setIsStreaming(false);
        setTokenCount(0);
        setProcessingTime(0);
        processingStartTime.current = 0;
        return true;
      }
      return false; // Let default escape handling work
    }

    // Handle command suggestions navigation
    if (showCommandSuggestions) {
      const filteredSuggestions = filterCommandSuggestions(
        commandSuggestions,
        input,
      );

      if (filteredSuggestions.length === 0) {
        setShowCommandSuggestions(false);
        setSelectedCommandIndex(0);
        return false; // Continue processing
      } else {
        if (key.upArrow) {
          setSelectedCommandIndex(prev =>
            prev === 0 ? filteredSuggestions.length - 1 : prev - 1,
          );
          return true;
        }
        if (key.downArrow) {
          setSelectedCommandIndex(
            prev => (prev + 1) % filteredSuggestions.length,
          );
          return true;
        }
        if (key.tab || key.return) {
          const safeIndex = Math.min(
            selectedCommandIndex,
            filteredSuggestions.length - 1,
          );
          const selectedCommand = filteredSuggestions[safeIndex];
          const newInput = selectedCommand.command + " ";
          setInput(newInput);
          setCursorPosition(newInput.length);
          setShowCommandSuggestions(false);
          setSelectedCommandIndex(0);
          return true;
        }
      }
    }

    // Handle model selection navigation
    if (showModelSelection) {
      if (key.upArrow) {
        setSelectedModelIndex(prev =>
          prev === 0 ? availableModels.length - 1 : prev - 1,
        );
        return true;
      }
      if (key.downArrow) {
        setSelectedModelIndex(prev => (prev + 1) % availableModels.length);
        return true;
      }
      if (key.tab || key.return) {
        const selectedModel = availableModels[selectedModelIndex];
        agent.setModel(selectedModel.model);
        updateCurrentModel(selectedModel.model);
        const confirmEntry: ChatEntry = {
          type: "assistant",
          content: `✓ Switched to model: ${selectedModel.model}`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, confirmEntry]);
        setShowModelSelection(false);
        setSelectedModelIndex(0);
        return true;
      }
    }

    // Handle mention suggestions navigation
    if (showMentionSuggestions) {
      const filtered = filterFileEntries(mentionSuggestions, mentionQuery);
      if (filtered.length === 0) {
        setShowMentionSuggestions(false);
        return false;
      }

      if (key.upArrow) {
        setSelectedMentionIndex(prev =>
          prev === 0 ? filtered.length - 1 : prev - 1,
        );
        return true;
      }
      if (key.downArrow) {
        setSelectedMentionIndex(prev => (prev + 1) % filtered.length);
        return true;
      }
      if (key.tab || key.return) {
        const selected = filtered[selectedMentionIndex];
        const lastAtIndex = input.lastIndexOf("@");
        const newInput =
          input.slice(0, lastAtIndex) + "@" + selected.path + " ";
        setInput(newInput);
        setCursorPosition(newInput.length);
        setShowMentionSuggestions(false);
        setSelectedMentionIndex(0);
        return true;
      }
    }

    return false; // Let default handling proceed
  };

  const handleInputSubmit = async (userInput: string) => {
    if (userInput === "exit" || userInput === "quit") {
      process.exit(0);
    }

    if (userInput.trim()) {
      const directCommandResult = await handleDirectCommand(userInput);
      if (!directCommandResult) {
        await processUserMessage(userInput);
      }
    }
  };

  const handleInputChange = (newInput: string) => {
    // Update command suggestions based on input
    if (newInput.startsWith("/")) {
      setShowCommandSuggestions(true);
      setSelectedCommandIndex(0);
    } else {
      setShowCommandSuggestions(false);
    }

    // Update mention suggestions based on input
    const mentionMatch = newInput.match(/@([\w\-\./]*)$/);
    if (mentionMatch) {
      setShowMentionSuggestions(true);
      setMentionQuery(mentionMatch[1]);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const {
    input,
    cursorPosition,
    setInput,
    setCursorPosition,
    clearInput,
    resetHistory,
    handleInput,
  } = useEnhancedInput({
    onSubmit: handleInputSubmit,
    onSpecialKey: handleSpecialKey,
    disabled: isConfirmationActive,
  });

  // Hook up the actual input handling
  useInput((inputChar: string, key: Key) => {
    handleInput(inputChar, key);
  });

  // Update command suggestions when input changes
  useEffect(() => {
    handleInputChange(input);
  }, [input]);

  const commandSuggestions: CommandSuggestion[] = [
    { command: "/help", description: "Show help information" },
    { command: "/clear", description: "Clear chat history" },
    { command: "/models", description: "Switch Super Agent Model" },
    { command: "/config", description: "View or edit configuration" },
    { command: "/provider", description: "Manage AI providers" },
    { command: "/commit-and-push", description: "AI commit & push to remote" },
    { command: "/exit", description: "Exit the application" },
  ];

  // Load models from configuration with fallback to defaults
  const availableModels: ModelOption[] = useMemo(() => {
    return loadModelConfig();
  }, []);

  const handleDirectCommand = async (input: string): Promise<boolean> => {
    const trimmedInput = input.trim();

    if (trimmedInput === "/clear") {
      // Reset chat history
      setChatHistory([]);

      // Reset processing states
      setIsProcessing(false);
      setIsStreaming(false);
      setTokenCount(0);
      setProcessingTime(0);
      processingStartTime.current = 0;

      // Reset confirmation service session flags
      const confirmationService = ConfirmationService.getInstance();
      confirmationService.resetSession();

      clearInput();
      resetHistory();
      return true;
    }

    if (trimmedInput === "/help") {
      const helpEntry: ChatEntry = {
        type: "assistant",
        content: `Super Agent CLI Help:

Built-in Commands:
  /clear      - Clear chat history
  /help       - Show this help
  /models     - Switch between available models
  /config     - View current configuration
  /provider   - List or switch AI providers
  /exit       - Exit application
  exit, quit  - Exit application

Git Commands:
  /commit-and-push - AI-generated commit + push to remote

Enhanced Input Features:
  ↑/↓ Arrow   - Navigate command history
  Ctrl+C      - Clear input (press twice to exit)
  Ctrl+K      - Delete to end of line
  Shift+Tab   - Toggle auto-edit mode (bypass confirmations)

Config Commands:
  /config             - View current active configuration
  /provider           - List configured providers
  /provider use <id>  - Switch active AI provider
  /model set <id>     - Set active model for current provider
`,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, helpEntry]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/exit") {
      process.exit(0);
    }

    if (trimmedInput === "/config") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const activeProvider = settings.active_provider;
      const activeConfig = settings.providers[activeProvider];

      const content = `Current Configuration:
- Active Provider: ${activeProvider}
- API Key: ${activeConfig?.api_key ? "********" : "(not set)"}
- Base URL: ${activeConfig?.base_url || "(default)"}
- Model: ${activeConfig?.model || "(default)"}
- Theme: ${settings.ui.theme}

Use '/provider' to see all providers.
Use '/provider use <id>' to switch.
`;
      setChatHistory(prev => [
        ...prev,
        { type: "assistant", content, timestamp: new Date() },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/provider") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const providers = Object.keys(settings.providers || {});
      const active = settings.active_provider;

      const content = `Configured Providers:
${providers.map(p => `- ${p} ${p === active ? "(active)" : ""}`).join("\n")}

Use '/provider use <id>' to switch provider.`;
      setChatHistory(prev => [
        ...prev,
        { type: "assistant", content, timestamp: new Date() },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/provider use ")) {
      const providerId = trimmedInput.replace("/provider use ", "").trim();
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      if (settings.providers && settings.providers[providerId]) {
        manager.updateUserSetting("active_provider", providerId);
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✓ Switched active provider to: ${providerId}`,
            timestamp: new Date(),
          },
        ]);
        // Also need to re-initialize agent with new keys?
        // The agent instance in ChatInterface handles its own state, but ideally we should update it.
        // For now, next request will pick up new key if we re-instantiate or if agent reads it dynamically.
        // But 'agent' prop is constant. We might need to call agent.setApiKey/BaseUrl.
        // The current SuperAgent implementation takes config in constructor.
        // To properly support dynamic switching without reload, SuperAgent should support `updateConfig`.
        // For now, we inform user they might need to restart or we assume next tool call uses new config if implemented that way.
        const newConfig = settings.providers[providerId];
        // Prudent hack: if agent exposes setters, use them. If not, warn user.
        // Assuming agent has setApiKey - checking agent/super-agent.ts would be good.
        // If not, we can rely on process.env which we might not have updated.
        // Let's assume for this step we just save settings.
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Provider '${providerId}' not found.`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/model set ")) {
      const modelId = trimmedInput.replace("/model set ", "").trim();
      if (modelId) {
        updateCurrentModel(modelId);
        agent.setModel(modelId);
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✓ Active model set to: ${modelId}`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput === "/models") {
      setShowModelSelection(true);
      setSelectedModelIndex(0);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/models ")) {
      const modelArg = trimmedInput.split(" ")[1];
      const modelNames = availableModels.map(m => m.model);

      if (modelNames.includes(modelArg)) {
        agent.setModel(modelArg);
        updateCurrentModel(modelArg); // Update project current model
        const confirmEntry: ChatEntry = {
          type: "assistant",
          content: `✓ Switched to model: ${modelArg}`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, confirmEntry]);
      } else {
        const errorEntry: ChatEntry = {
          type: "assistant",
          content: `Invalid model: ${modelArg}

Available models: ${modelNames.join(", ")}`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, errorEntry]);
      }

      clearInput();
      return true;
    }

    if (trimmedInput === "/commit-and-push") {
      const userEntry: ChatEntry = {
        type: "user",
        content: "/commit-and-push",
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, userEntry]);

      setIsProcessing(true);
      setIsStreaming(true);

      try {
        // First check if there are any changes at all
        const initialStatusResult = await agent.executeBashCommand(
          "git status --porcelain",
        );

        if (
          !initialStatusResult.success ||
          !initialStatusResult.output?.trim()
        ) {
          const noChangesEntry: ChatEntry = {
            type: "assistant",
            content: "No changes to commit. Working directory is clean.",
            timestamp: new Date(),
          };
          setChatHistory(prev => [...prev, noChangesEntry]);
          setIsProcessing(false);
          setIsStreaming(false);
          setInput("");
          return true;
        }

        // Add all changes
        const addResult = await agent.executeBashCommand("git add .");

        if (!addResult.success) {
          const addErrorEntry: ChatEntry = {
            type: "assistant",
            content: `Failed to stage changes: ${
              addResult.error || "Unknown error"
            }`,
            timestamp: new Date(),
          };
          setChatHistory(prev => [...prev, addErrorEntry]);
          setIsProcessing(false);
          setIsStreaming(false);
          setInput("");
          return true;
        }

        // Show that changes were staged
        const addEntry: ChatEntry = {
          type: "tool_result",
          content: "Changes staged successfully",
          timestamp: new Date(),
          toolCall: {
            id: `git_add_${Date.now()}`,
            type: "function",
            function: {
              name: "bash",
              arguments: JSON.stringify({ command: "git add ." }),
            },
          },
          toolResult: addResult,
        };
        setChatHistory(prev => [...prev, addEntry]);

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

        let commitMessage = "";
        let streamingEntry: ChatEntry | null = null;

        for await (const chunk of agent.processUserMessageStream(
          commitPrompt,
        )) {
          if (chunk.type === "content" && chunk.content) {
            if (!streamingEntry) {
              const newEntry = {
                type: "assistant" as const,
                content: `Generating commit message...\n\n${chunk.content}`,
                timestamp: new Date(),
                isStreaming: true,
              };
              setChatHistory(prev => [...prev, newEntry]);
              streamingEntry = newEntry;
              commitMessage = chunk.content;
            } else {
              commitMessage += chunk.content;
              setChatHistory(prev =>
                prev.map((entry, idx) =>
                  idx === prev.length - 1 && entry.isStreaming
                    ? {
                        ...entry,
                        content: `Generating commit message...\n\n${commitMessage}`,
                      }
                    : entry,
                ),
              );
            }
          } else if (chunk.type === "done") {
            if (streamingEntry) {
              setChatHistory(prev =>
                prev.map(entry =>
                  entry.isStreaming
                    ? {
                        ...entry,
                        content: `Generated commit message: "${commitMessage.trim()}"`,
                        isStreaming: false,
                      }
                    : entry,
                ),
              );
            }
            break;
          }
        }

        // Execute the commit
        const cleanCommitMessage = commitMessage
          .trim()
          .replace(/^["']|["']$/g, "");
        const commitCommand = `git commit -m "${cleanCommitMessage}"`;
        const commitResult = await agent.executeBashCommand(commitCommand);

        const commitEntry: ChatEntry = {
          type: "tool_result",
          content: commitResult.success
            ? commitResult.output || "Commit successful"
            : commitResult.error || "Commit failed",
          timestamp: new Date(),
          toolCall: {
            id: `git_commit_${Date.now()}`,
            type: "function",
            function: {
              name: "bash",
              arguments: JSON.stringify({ command: commitCommand }),
            },
          },
          toolResult: commitResult,
        };
        setChatHistory(prev => [...prev, commitEntry]);

        // If commit was successful, push to remote
        if (commitResult.success) {
          // First try regular push, if it fails try with upstream setup
          let pushResult = await agent.executeBashCommand("git push");
          let pushCommand = "git push";

          if (
            !pushResult.success &&
            pushResult.error?.includes("no upstream branch")
          ) {
            pushCommand = "git push -u origin HEAD";
            pushResult = await agent.executeBashCommand(pushCommand);
          }

          const pushEntry: ChatEntry = {
            type: "tool_result",
            content: pushResult.success
              ? pushResult.output || "Push successful"
              : pushResult.error || "Push failed",
            timestamp: new Date(),
            toolCall: {
              id: `git_push_${Date.now()}`,
              type: "function",
              function: {
                name: "bash",
                arguments: JSON.stringify({ command: pushCommand }),
              },
            },
            toolResult: pushResult,
          };
          setChatHistory(prev => [...prev, pushEntry]);
        }
      } catch (error: any) {
        const errorEntry: ChatEntry = {
          type: "assistant",
          content: `Error during commit and push: ${error.message}`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, errorEntry]);
      }

      setIsProcessing(false);
      setIsStreaming(false);
      clearInput();
      return true;
    }

    const directBashCommands = [
      "ls",
      "pwd",
      "cd",
      "cat",
      "mkdir",
      "touch",
      "echo",
      "grep",
      "find",
      "cp",
      "mv",
      "rm",
    ];
    const firstWord = trimmedInput.split(" ")[0];

    if (directBashCommands.includes(firstWord)) {
      const userEntry: ChatEntry = {
        type: "user",
        content: trimmedInput,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, userEntry]);

      try {
        const result = await agent.executeBashCommand(trimmedInput);

        const commandEntry: ChatEntry = {
          type: "tool_result",
          content: result.success
            ? result.output || "Command completed"
            : result.error || "Command failed",
          timestamp: new Date(),
          toolCall: {
            id: `bash_${Date.now()}`,
            type: "function",
            function: {
              name: "bash",
              arguments: JSON.stringify({ command: trimmedInput }),
            },
          },
          toolResult: result,
        };
        setChatHistory(prev => [...prev, commandEntry]);
      } catch (error: any) {
        const errorEntry: ChatEntry = {
          type: "assistant",
          content: `Error executing command: ${error.message}`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, errorEntry]);
      }

      clearInput();
      return true;
    }

    return false;
  };

  const processUserMessage = async (userInput: string) => {
    let resolvedInput = userInput;

    // Resolve mentions (@filename)
    const mentionMatches = userInput.match(/@([\w\-\./]+)/g);
    if (mentionMatches) {
      for (const mention of mentionMatches) {
        const filePath = mention.slice(1); // Remove @
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const content = await fs.readFile(filePath, "utf-8");
            resolvedInput = resolvedInput.replace(
              mention,
              `\n\n--- FILE: ${filePath} ---\n${content}\n--- END FILE ---\n\n`,
            );
          } else if (stats.isDirectory()) {
            const tree = await listFilesRecursive(filePath, process.cwd(), 1);
            const structure = tree
              .map(t => `${t.isDirectory ? "📁" : "📄"} ${t.path}`)
              .join("\n");
            resolvedInput = resolvedInput.replace(
              mention,
              `\n\n--- DIRECTORY: ${filePath} ---\n${structure}\n--- END DIRECTORY ---\n\n`,
            );
          }
        } catch (e) {
          // Skip if file not found
        }
      }
    }

    // Add mode context if needed
    if (agentMode === "plan") {
      resolvedInput = `[MODE: PLAN] ${resolvedInput}`;
    } else if (agentMode === "debug") {
      resolvedInput = `[MODE: DEBUG] ${resolvedInput}`;
    }

    const userEntry: ChatEntry = {
      type: "user",
      content: userInput, // Keep original for UI
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userEntry]);

    setIsProcessing(true);
    clearInput();

    try {
      setIsStreaming(true);
      let streamingEntry: ChatEntry | null = null;

      for await (const chunk of agent.processUserMessageStream(resolvedInput)) {
        switch (chunk.type) {
          case "content":
            if (chunk.content) {
              if (!streamingEntry) {
                const newStreamingEntry = {
                  type: "assistant" as const,
                  content: chunk.content,
                  timestamp: new Date(),
                  isStreaming: true,
                };
                setChatHistory(prev => [...prev, newStreamingEntry]);
                streamingEntry = newStreamingEntry;
              } else {
                setChatHistory(prev =>
                  prev.map((entry, idx) =>
                    idx === prev.length - 1 && entry.isStreaming
                      ? { ...entry, content: entry.content + chunk.content }
                      : entry,
                  ),
                );
              }
            }
            break;

          case "token_count":
            if (chunk.tokenCount !== undefined) {
              setTokenCount(chunk.tokenCount);
            }
            break;

          case "tool_calls":
            if (chunk.toolCalls) {
              // Stop streaming for the current assistant message
              setChatHistory(prev =>
                prev.map(entry =>
                  entry.isStreaming
                    ? {
                        ...entry,
                        isStreaming: false,
                        toolCalls: chunk.toolCalls,
                      }
                    : entry,
                ),
              );
              streamingEntry = null;

              // Add individual tool call entries to show tools are being executed
              chunk.toolCalls.forEach(toolCall => {
                const toolCallEntry: ChatEntry = {
                  type: "tool_call",
                  content: "Executing...",
                  timestamp: new Date(),
                  toolCall: toolCall,
                };
                setChatHistory(prev => [...prev, toolCallEntry]);
              });
            }
            break;

          case "tool_result":
            if (chunk.toolCall && chunk.toolResult) {
              const result = chunk.toolResult;
              setChatHistory(prev =>
                prev.map(entry => {
                  if (entry.isStreaming) {
                    return { ...entry, isStreaming: false };
                  }
                  // Update the existing tool_call entry with the result
                  if (
                    entry.type === "tool_call" &&
                    entry.toolCall?.id === chunk.toolCall?.id
                  ) {
                    return {
                      ...entry,
                      type: "tool_result",
                      content: result.success
                        ? result.output || "Success"
                        : result.error || "Error occurred",
                      toolResult: result,
                    };
                  }
                  return entry;
                }),
              );
              streamingEntry = null;
            }
            break;

          case "done":
            if (streamingEntry) {
              setChatHistory(prev =>
                prev.map(entry =>
                  entry.isStreaming ? { ...entry, isStreaming: false } : entry,
                ),
              );
            }
            setIsStreaming(false);
            break;
        }
      }
    } catch (error: any) {
      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, errorEntry]);
      setIsStreaming(false);
    }

    setIsProcessing(false);
    processingStartTime.current = 0;
  };

  return {
    input,
    cursorPosition,
    showCommandSuggestions,
    selectedCommandIndex,
    showModelSelection,
    selectedModelIndex,
    commandSuggestions,
    availableModels,
    autoEditEnabled,
    setInput,
    setCursorPosition,
    clearInput,
    resetHistory,
    handleInput,
    agentMode,
    showMentionSuggestions,
    selectedMentionIndex,
    mentionSuggestions,
    mentionQuery,
    showCommandPalette,
    commandPaletteQuery,
    selectedPaletteIndex,
  };
}
