import {
  FileEntry,
  filterFileEntries,
  listFilesRecursive,
} from "../utils/file-utils";
import { ConfirmationService } from "../utils/confirmation-service";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Key, useEnhancedInput } from "./use-enhanced-input";
import { ChatEntry, SuperAgent } from "../agent/super-agent";
import { useInput } from "ink";
import * as path from "path";
import * as os from "os";

import { filterCommandSuggestions } from "../ui/components/command-suggestions";
import { loadModelConfig, updateCurrentModel } from "../utils/model-config";
import { getMCPManager, initializeMCPServers } from "../core/tools";
import { handleRepositoryCommand } from "../commands/repository";
import { getSettingsManager } from "../utils/settings-manager";
import { getChatManager } from "../utils/chat-manager";
import { getPluginManager } from "../plugins/manager";
import fs from "fs-extra";

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

  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [selectedProviderIndex, setSelectedProviderIndex] = useState(0);

  const [showConfigViewer, setShowConfigViewer] = useState(false);
  const [customCommandsVersion, setCustomCommandsVersion] = useState(0);

  // Load files for mentions on mount or periodically
  useEffect(() => {
    listFilesRecursive(process.cwd()).then(setMentionSuggestions);
  }, []);

  // Helper function to reset all UI states
  const resetAllUIStates = useCallback(() => {
    setShowCommandPalette(false);
    setShowMentionSuggestions(false);
    setShowProviderSelection(false);
    setShowModelSelection(false);
    setShowConfigViewer(false);
    setShowCommandSuggestions(false);
    setCommandPaletteQuery("");
    setSelectedPaletteIndex(0);
    setSelectedMentionIndex(0);
    setSelectedCommandIndex(0);
    setSelectedModelIndex(0);
  }, []);

  const handleSpecialKey = async (char: string, key: Key): Promise<boolean> => {
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

    // Handle Ctrl+Y for YOLO mode (Toggle auto-edit)
    // Ctrl+Y is usually 0x19 (\x19)
    const isCtrlY =
      char === "\x19" || (key.ctrl && (char === "y" || char === "Y"));
    if (isCtrlY) {
      const newAutoEditState = !autoEditEnabled;
      setAutoEditEnabled(newAutoEditState);

      const confirmationService = ConfirmationService.getInstance();
      if (newAutoEditState) {
        confirmationService.setSessionFlag("allOperations", true);
      } else {
        confirmationService.resetSession();
      }

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `🚀 YOLO Mode: ${newAutoEditState ? "ENABLED" : "DISABLED"}`,
          timestamp: new Date(),
        },
      ]);
      return true;
    }

    // Handle Shift+! (approximate trigger for shell mode)
    // Only trigger if input is empty to allow typing ! normally
    const isShellTrigger = char === "!" && input === "";
    if (isShellTrigger) {
      const newInput = "!";
      setInput(newInput);
      setCursorPosition(newInput.length);
      return true;
    }

    // Handle Ctrl+P for Command Palette
    // Ctrl+P is usually 0x10 (\x10)
    const isCtrlP =
      char === "\x10" || (key.ctrl && (char === "p" || char === "P"));
    if (isCtrlP) {
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
          // Replace entire input with the @mention, not append
          const newInput = "@" + selected.path + " ";
          setInput(newInput);
          setCursorPosition(newInput.length);
        }
        // Clear palette state
        setCommandPaletteQuery("");
        setSelectedPaletteIndex(0);
        setShowCommandPalette(false);
        return true;
      }
      if (key.escape) {
        setCommandPaletteQuery("");
        setSelectedPaletteIndex(0);
        setShowCommandPalette(false);
        return true;
      }
      // Capture typing for palette query - use char instead of sequence
      if (
        char &&
        char.length === 1 &&
        !key.ctrl &&
        !key.meta &&
        !key.escape &&
        !key.return &&
        !key.tab &&
        !key.upArrow &&
        !key.downArrow
      ) {
        setCommandPaletteQuery(prev => prev + char);
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

    // Handle provider selection navigation
    if (showProviderSelection) {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const providers = Object.keys(settings.providers || {});

      if (key.upArrow) {
        setSelectedProviderIndex(prev =>
          prev === 0 ? Math.max(0, providers.length - 1) : prev - 1,
        );
        return true;
      }
      if (key.downArrow) {
        setSelectedProviderIndex(
          prev => (prev + 1) % Math.max(1, providers.length),
        );
        return true;
      }
      if (key.return || key.tab) {
        if (providers.length > 0) {
          const selectedProviderId = providers[selectedProviderIndex];
          const providerConfig = settings.providers[selectedProviderId];

          // Validate provider has API key
          if (
            !providerConfig?.api_key &&
            providerConfig?.provider !== "openai-compatible"
          ) {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `❌ Provider '${selectedProviderId}' requires an API key. Use '/provider config ${selectedProviderId}' to configure.`,
                timestamp: new Date(),
              },
            ]);
            setShowProviderSelection(false);
            return true;
          }

          try {
            manager.setActiveProvider(selectedProviderId);
            await agent.setProvider(selectedProviderId);
            setActiveProvider(selectedProviderId);

            // Suggest restart for certain providers
            const suggestRestart =
              providerConfig?.provider === "openai" ||
              providerConfig?.provider === "gemini";

            let restartMessage = "";
            if (suggestRestart) {
              restartMessage =
                "\n\nNote: Some providers may require a full restart of the CLI to take effect.";
            }

            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `✓ Switched active provider to: ${selectedProviderId}${restartMessage}`,
                timestamp: new Date(),
              },
            ]);
          } catch (error: any) {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `❌ Failed to switch provider: ${error.message}`,
                timestamp: new Date(),
              },
            ]);
          }
        }
        setShowProviderSelection(false);
        return true;
      }
      if (key.escape) {
        setShowProviderSelection(false);
        return true;
      }

      // Handle API Key editing
      if (char === "e" || char === "E") {
        if (providers.length > 0) {
          const selectedProviderId = providers[selectedProviderIndex];
          // Hacky way to prompt: close selection, start direct input or show message?
          // Ideally we'd have a modal input.
          // Let's use the CLI provider config via run_command logic or similar?
          // Or better, just print instructions since we are in a raw input mode hook.
          // Actually, we can use the chat history to prompt the user or switch mode.
          // But simpler: just auto-fill the input with a command to set the key?
          // There is no /provider set-key command yet.

          // Alternative: Switch to /provider config interactive command?
          // But that's a different command.

          // Let's just notify for now or add a "Edit" hint that tells them to use /provider config.
          // But the user asked for "pressing E on the provider allows editing".
          // We can implement a simple input mode overlay if we want, but complex.

          // Let's inject a command into the input line to help them.
          // setInput(`/provider config ${selectedProviderId}`); // if that supported args

          // Or better: trigger the interactive config for that provider immediately if possible?
          // Since we are inside the hook, we can't easily spawn the inquirer process.

          // Let's just auto-fill the input with a hint for now, or implement a lightweight key setter.

          // Implementation plan:
          // 1. Notify user in chat to use /provider config
          // 2. OR, actually start an inline input mode for the key.

          // Simplest compliant fix:
          const manager = getSettingsManager();
          const currentKey =
            manager.getUserSetting("providers")?.[selectedProviderId]
              ?.api_key || "";

          const commandInput = `/provider set-key ${selectedProviderId} `;
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `📝 Editing API key for ${selectedProviderId}. Press Enter after pasting key.`,
              timestamp: new Date(),
            },
          ]);
          setShowProviderSelection(false);
          // Auto-fill input with command and position cursor at end
          setInput(commandInput, commandInput.length);
        }
        return true;
      }

      return true; // Absorb other keys while provider selection is open
    }

    // Handle config viewer
    if (showConfigViewer) {
      if (key.escape) {
        setShowConfigViewer(false);
        return true;
      }
      return true; // Absorb other keys while config viewer is open
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

          // Strip placeholders like <name>, [action], etc.
          // Examples: "/chat save <name>" -> "/chat save ", "/mcp <action>" -> "/mcp "
          const stripCommandPlaceholders = (command: string): string => {
            let previous: string;
            let current = command;
            do {
              previous = current;
              current = current
                .replace(/\s*<[^>]+>/g, "")
                .replace(/\s*\[[^\]]+\]/g, "");
            } while (current !== previous);
            return current;
          };

          let completedCommand = stripCommandPlaceholders(
            selectedCommand.command,
          );
          // If it doesn't end with a space and it was a placeholder-heavy command, add a space
          if (
            !completedCommand.endsWith(" ") &&
            selectedCommand.command.includes("<")
          ) {
            completedCommand += " ";
          } else if (!completedCommand.endsWith(" ")) {
            completedCommand += " ";
          }

          // Preserve any text that might be after the cursor if we're in the middle of input
          const afterCursor = input.slice(cursorPosition);
          const newInput = completedCommand + afterCursor;

          // Set input and position cursor at the end of the completed command part
          setInput(newInput, completedCommand.length);

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
        // Find the @ symbol we're currently completing (most recent one before cursor)
        const beforeCursor = input.slice(0, cursorPosition);
        const atMatchIndex = beforeCursor.lastIndexOf("@");
        if (atMatchIndex !== -1) {
          // Replace from the @ symbol to the cursor with the selected path
          const beforeAt = input.slice(0, atMatchIndex);
          const afterCursor = input.slice(cursorPosition);
          const newInput = beforeAt + "@" + selected.path + " " + afterCursor;
          const newCursorPosition = atMatchIndex + selected.path.length + 2; // Position after "@path "
          setInput(newInput, newCursorPosition);
        } else {
          // Fallback: append to end
          const newInput = input + "@" + selected.path + " ";
          setInput(newInput, newInput.length);
        }
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
    onEscape: () => {
      if (showCommandSuggestions) {
        setShowCommandSuggestions(false);
        setSelectedCommandIndex(0);
      } else if (showModelSelection) {
        setShowModelSelection(false);
        setSelectedModelIndex(0);
      } else if (showMentionSuggestions) {
        setShowMentionSuggestions(false);
      } else if (showCommandPalette) {
        setShowCommandPalette(false);
      } else if (isProcessing || isStreaming) {
        agent.abortCurrentOperation();
        setIsProcessing(false);
        setIsStreaming(false);
        setTokenCount(0);
        setProcessingTime(0);
        processingStartTime.current = 0;
      }
    },
    disabled: isConfirmationActive,
  });

  // Hook up the actual input handling
  useInput(async (inputChar: string, key: Key) => {
    if (await handleSpecialKey(inputChar, key)) {
      return;
    }
    handleInput(inputChar, key);
  });

  // Update command suggestions when input changes
  useEffect(() => {
    handleInputChange(input);
  }, [input]);

  const commandSuggestions: CommandSuggestion[] = useMemo(() => {
    const baseCommands: CommandSuggestion[] = [
      { command: "/help", description: "Show help information" },
      { command: "/clear", description: "Clear chat history" },
      { command: "/theme", description: "Customize application theme" },
      {
        command: "/init",
        description: "Create Agents.md for project instructions",
      },
      { command: "/doctor", description: "Check status & connection" },
      { command: "/models", description: "Switch Super Agent Model" },
      { command: "/config", description: "View or edit configuration" },
      { command: "/commands", description: "Manage custom commands" },
      { command: "/provider", description: "Manage AI providers" },
      {
        command: "/generate-image",
        description: "Generate AI images from text",
      },
      { command: "/chat save <name>", description: "Save current chat" },
      { command: "/chat load <name>", description: "Load a saved chat" },
      { command: "/chat list", description: "List saved chats" },
      { command: "/chat delete <name>", description: "Delete a saved chat" },
      { command: "/skills", description: "Manage AI skills" },
      { command: "/agents", description: "Manage AI agents" },
      { command: "/import", description: "Import from other AI assistants" },
      { command: "/index", description: "Index current directory" },
      {
        command: "/mcp <action>",
        description: "Manage MCP servers",
      },
      {
        command: "/plugin <action>",
        description: "Manage plugins (list, install, remove)",
      },
      {
        command: "/commit-and-push",
        description: "AI commit & push to remote",
      },
      {
        command: "/import <type> <source>",
        description: "Import resources (agents, skills, hooks)",
      },
      {
        command: "/repo",
        description: "Manage plugin repositories",
      },
      {
        command: "/repo install <type>",
        description: "Install a plugin repository",
      },
      {
        command: "/repo list",
        description: "List installed repositories",
      },
      {
        command: "/repo update",
        description: "Update all repositories",
      },
      {
        command: "/repo enable <name>",
        description: "Enable a plugin item",
      },
      { command: "/exit", description: "Exit the application" },
    ];

    // Add custom commands from settings
    const manager = getSettingsManager();
    const settings = manager.loadUserSettings();
    const customCommands = settings.custom_commands || {};

    const customSuggestions: CommandSuggestion[] = Object.keys(
      customCommands,
    ).map(name => ({
      command: `/${name}`,
      description: customCommands[name],
    }));

    return [...baseCommands, ...customSuggestions];
  }, [customCommandsVersion]);

  const [activeProvider, setActiveProvider] = useState(() => {
    return getSettingsManager().loadUserSettings().active_provider;
  });

  // Load models from configuration with fallback to defaults
  // Also try to fetch dynamic models from the agent
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    // Fetch models when active provider changes
    let mounted = true;
    const fetchModels = async () => {
      try {
        setIsFetchingModels(true);
        const models = await agent.fetchAvailableModels();
        if (mounted && models.length > 0) {
          setDynamicModels(models);
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) {
          setIsFetchingModels(false);
        }
      }
    };
    fetchModels();
    return () => {
      mounted = false;
    };
  }, [activeProvider, agent]);

  const availableModels: ModelOption[] = useMemo(() => {
    const configModels = loadModelConfig(activeProvider);

    if (dynamicModels.length > 0) {
      // Merge dynamic models with config models, avoiding duplicates
      const configModelNames = new Set(configModels.map(m => m.model));
      const newModels = dynamicModels
        .filter(m => !configModelNames.has(m))
        .map(m => ({ model: m }));

      // Return config models first (priority) then dynamic
      return [...configModels, ...newModels];
    }

    return configModels;
  }, [activeProvider, dynamicModels]);

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

    if (trimmedInput === "/theme") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const currentTheme = settings.ui.theme || "dark";

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `Current theme: ${currentTheme}\n\nAvailable themes: dark, light\n\nUsage: /theme <name>\nExample: /theme light`,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/theme ")) {
      const themeName = trimmedInput
        .replace("/theme ", "")
        .trim()
        .toLowerCase();

      if (themeName === "dark" || themeName === "light") {
        const manager = getSettingsManager();
        const settings = manager.loadUserSettings();
        settings.ui.theme = themeName;
        manager.saveUserSettings(settings);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Theme switched to: ${themeName}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Invalid theme: ${themeName}. Available: dark, light`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput === "/help") {
      const helpEntry: ChatEntry = {
        type: "assistant",
        content: `Super Agent CLI Help:

Built-in Commands:
  /clear      - Clear chat history
  /help       - Show this help
  /theme      - Customize application theme
  /doctor     - Check system health & connection
  /init       - Create Agents.md for project-specific AI instructions
  /exit       - Exit application
  exit, quit  - Exit application

Provider Commands:
  /provider              - Show provider selection UI
  /provider list         - List all configured providers
  /provider info <id>    - Show detailed provider info
  /provider use <id>     - Switch active AI provider
  /provider set-key <id> <key>   - Set API key for provider
  /provider set-url <id> <url>   - Set base URL for provider
  /provider set-account <id> <acc_id> - Set account ID (e.g. workers-ai)
  /provider remove <id>  - Remove a provider
  /provider reset        - Reset provider settings to defaults

Model Commands:
  /models              - Show model selection UI
  /models list         - List all available models
  /models refresh      - Refresh models from provider API
  /models set <id>     - Set active model for current provider

Status Bar Commands:
  /statusbar           - Toggle status bar visibility
  /statusbar show      - Show status bar
  /statusbar hide      - Hide status bar
  /statusbar config    - Configure status bar items
  /statusline          - Alias for /statusbar

Config Commands:
  /config              - View current active configuration
  /config get <key>    - Get specific config value
  /config set <k> <v>  - Set config value
  /config reset        - Reset settings to defaults

Image Generation Commands:
  /generate-image <prompt>     - Generate AI image from text prompt
  /generate-image "a cat"      - Basic usage
  /generate-image "a cat 1024x1024 as png"  - With size and format
  /config set image_generation.provider openai - Set image provider
  /config set image_generation.model dall-e-3 - Set image model

Custom Commands:
  /commands            - Manage custom slash commands
  /commands add <name> <prompt>    - Add custom command
  /commands remove <name>         - Remove custom command
  /commands list                 - List custom commands

Git Commands:
  /commit-and-push - AI-generated commit + push to remote

Repository Commands:
  /repo                - List installed repositories and items
  /repo available      - List all available builtin repositories
  /repo install <type> - Install a repository (agents, skills, hooks, mcp)
  /repo update         - Update all installed repositories
  /repo enable <name>  - Enable an item from a repository
  /repo disable <name> - Disable an item from a repository
  /repo remove <type>  - Remove an installed repository

Enhanced Input Features:
  ↑/↓ Arrow   - Navigate command history
  Ctrl+C      - Clear input (press twice to exit)
  Ctrl+K      - Delete to end of line
  Shift+Tab   - Toggle agent mode (plan/code/debug)
  Ctrl+Y      - Toggle YOLO mode (auto-edit)
  Ctrl+P      - Open command palette
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

    // Handle repository commands
    if (trimmedInput.startsWith("/repo")) {
      const handled = await handleRepositoryCommand(trimmedInput);
      if (handled) {
        clearInput();
        return true;
      }
    }

    if (trimmedInput === "/doctor") {
      setIsProcessing(true);
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const active = settings.active_provider;
      const config = settings.providers[active];

      let checks = `Super Agent Doctor 🩺\n\n`;
      checks += `✅ Active Provider: ${active}\n`;
      checks += config
        ? `✅ Configuration found\n`
        : `❌ Configuration MISSING\n`;
      checks += config?.api_key ? `✅ API Key set\n` : `❌ API Key MISSING\n`;

      if (active === "workers-ai") {
        checks += config?.account_id
          ? `✅ Account ID set\n`
          : `❌ Account ID MISSING (use /provider set-account)\n`;
      }

      try {
        // Basic list models attempt
        const checkAgent = agent;
        // cast if needed or assume updated interface
        const models = await (checkAgent as any).listModels();
        checks += `✅ Connection check: OK (${models.length} models found)\n`;
      } catch (e: any) {
        checks += `❌ Connection check: FAILED (${e.message})\n`;
      }

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: checks,
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
      clearInput();
      return true;
    }

    if (trimmedInput === "/commands") {
      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: "Usage: /commands <add|remove|list> [name] [prompt]",
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/commands ")) {
      const args = trimmedInput.split(" ");
      const action = args[1];
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const customCommands = settings.custom_commands || {};

      if (action === "add") {
        const name = args[2];
        const prompt = args.slice(3).join(" ");

        if (!name || !prompt) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: "❌ Usage: /commands add <name> <prompt>",
              timestamp: new Date(),
            },
          ]);
          clearInput();
          return true;
        }

        const newCommands = { ...customCommands, [name]: prompt };
        manager.updateUserSetting("custom_commands", newCommands);
        setCustomCommandsVersion(v => v + 1);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Custom command '/${name}' created.`,
            timestamp: new Date(),
          },
        ]);
      } else if (action === "remove") {
        const name = args[2];

        if (!name || !customCommands[name]) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Command '/${name}' not found.`,
              timestamp: new Date(),
            },
          ]);
          clearInput();
          return true;
        }

        const newCommands = { ...customCommands };
        delete newCommands[name];
        manager.updateUserSetting("custom_commands", newCommands);
        setCustomCommandsVersion(v => v + 1);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Custom command '/${name}' removed.`,
            timestamp: new Date(),
          },
        ]);
      } else if (action === "list") {
        const commandList = Object.keys(customCommands);

        if (commandList.length === 0) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content:
                "No custom commands defined. Use /commands add to create one.",
              timestamp: new Date(),
            },
          ]);
        } else {
          const list = commandList
            .map(name => `  /${name} - ${customCommands[name]}`)
            .join("\n");

          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `Custom Commands:\n${list}`,
              timestamp: new Date(),
            },
          ]);
        }
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /commands <add|remove|list> [name] [prompt]",
            timestamp: new Date(),
          },
        ]);
      }

      clearInput();
      return true;
    }

    if (trimmedInput === "/config") {
      setShowConfigViewer(true);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/config get ")) {
      const key = trimmedInput.replace("/config get ", "").trim();
      const manager = getSettingsManager();
      const settings = manager.getEffectiveSettings();

      if (!key) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /config get <key>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      // Support nested keys like "providers.grok.model"
      const keys = key.split(".");
      let value: any = settings;
      for (const k of keys) {
        value = value?.[k];
      }

      if (value === undefined) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Key '${key}' not found in settings.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        const displayValue =
          typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : String(value);
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `${key}:\n${displayValue}`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/config set ")) {
      const parts = trimmedInput.replace("/config set ", "").trim().split(" ");
      const key = parts[0];
      const value = parts.slice(1).join(" ");

      if (!key || value === undefined) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /config set <key> <value>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      // Support nested keys like "providers.grok.model"
      const keys = key.split(".");
      if (keys.length === 1) {
        // Simple key
        try {
          // Try to parse as JSON for objects/arrays
          const parsedValue =
            value.startsWith("{") || value.startsWith("[")
              ? JSON.parse(value)
              : value;
          (settings as any)[key] = parsedValue;
          manager.saveUserSettings(settings);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✅ Set ${key} = ${value}`,
              timestamp: new Date(),
            },
          ]);
        } catch (e) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Failed to parse value. Use JSON format for objects/arrays.`,
              timestamp: new Date(),
            },
          ]);
        }
      } else {
        // Nested key - simplified implementation for common cases
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content:
              "❌ Nested key setting not yet supported. Use specific commands like /provider set-url",
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput === "/config reset") {
      const manager = getSettingsManager();
      const userSettingsPath = path.join(
        os.homedir(),
        ".super-agent",
        "settings.json",
      );

      try {
        // Backup current settings
        const backupPath = userSettingsPath + ".backup";
        if (fs.existsSync(userSettingsPath)) {
          fs.copyFileSync(userSettingsPath, backupPath);
        }

        // Clear settings to trigger re-creation with defaults
        fs.unlinkSync(userSettingsPath);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content:
              "✅ Settings reset to defaults. Backup saved to settings.json.backup",
            timestamp: new Date(),
          },
        ]);
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Failed to reset settings: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    // Image generation commands
    if (trimmedInput.startsWith("/generate-image ")) {
      const prompt = trimmedInput.replace("/generate-image ", "").trim();

      if (!prompt) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content:
              '❌ Usage: /generate-image <prompt>\nExample: /generate-image "a cat in the forest comic art"',
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      // Import and use the image generation service
      (async () => {
        try {
          const { getImageGenerationService } =
            await import("../image-generation");
          const service = getImageGenerationService();

          // Parse prompt for size and format
          const parsed = service.parsePrompt(prompt);

          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `🎨 Generating image: "${parsed.cleanPrompt}"${parsed.size ? ` (${parsed.size})` : ""}${parsed.format ? ` as ${parsed.format}` : ""}...\n`,
              timestamp: new Date(),
            },
          ]);

          const result = await service.generateImages({
            prompt: parsed.cleanPrompt,
            size: parsed.size,
            format: parsed.format,
          });

          if (result.success) {
            let output = `✅ Generated ${result.images.length} image(s):\n`;
            for (const img of result.images) {
              output += `   📁 ${img.path}\n`;
              if (img.revised_prompt) {
                output += `   💭 Revised: ${img.revised_prompt}\n`;
              }
            }
            output += `\nImages saved to: ${service.getOutputDirectory()}`;

            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: output,
                timestamp: new Date(),
              },
            ]);
          } else {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `❌ ${result.error}`,
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error: any) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Image generation failed: ${error.message}`,
              timestamp: new Date(),
            },
          ]);
        }
      })();

      clearInput();
      return true;
    }

    // Init command - Create Agents.md file
    if (trimmedInput === "/init") {
      (async () => {
        try {
          const { createAgentsMd, agentsMdExists } =
            await import("../utils/agents-md");

          // Check if Agents.md already exists
          const exists = await agentsMdExists();

          if (exists) {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `ℹ️ Agents.md already exists in the current directory.

To recreate it, delete the existing file first and run /init again.`,
                timestamp: new Date(),
              },
            ]);
            return;
          }

          // Create Agents.md with default template
          const result = await createAgentsMd({
            projectName: path.basename(process.cwd()),
          });

          if (result.success) {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `✅ Created Agents.md at ${result.path}

This file contains project-specific instructions for the AI agent.
Edit it to add:
- Project overview and tech stack
- Coding conventions and standards
- Preferred patterns and libraries
- Any specific instructions for the AI agent

The AI agent will read this file when assisting with your project.`,
                timestamp: new Date(),
              },
            ]);
          } else {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `❌ ${result.error}`,
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error: any) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Failed to create Agents.md: ${error.message}`,
              timestamp: new Date(),
            },
          ]);
        }
      })();

      clearInput();
      return true;
    }

    // Status bar commands
    if (
      trimmedInput === "/statusbar" ||
      trimmedInput === "/statusline" ||
      trimmedInput === "/statusbar toggle"
    ) {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const currentStatus = settings.ui.show_statusbar || false;

      settings.ui.show_statusbar = !currentStatus;
      manager.saveUserSettings(settings);

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `✅ Status bar ${!currentStatus ? "enabled" : "disabled"}`,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/statusbar show") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      settings.ui.show_statusbar = true;
      manager.saveUserSettings(settings);

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: "✅ Status bar enabled",
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/statusbar hide") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      settings.ui.show_statusbar = false;
      manager.saveUserSettings(settings);

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: "✅ Status bar disabled",
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/statusbar config") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const config = settings.ui.statusbar_config;

      const configText = `
Status Bar Configuration:
  show_model: ${config?.show_model ?? true}
  show_tool_calls: ${config?.show_tool_calls ?? true}
  show_git_status: ${config?.show_git_status ?? true}
  show_memory: ${config?.show_memory ?? false}
  show_cpu: ${config?.show_cpu ?? false}
  show_tokens: ${config?.show_tokens ?? true}
  show_context: ${config?.show_context ?? true}

Use /config set ui.statusbar_config.show_model true to toggle individual items.
      `.trim();

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: configText,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/provider") {
      setShowProviderSelection(true);
      setSelectedProviderIndex(0);
      clearInput();
      return true;
    }

    if (trimmedInput === "/provider config") {
      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content:
            "⚠️ Interactive configuration cannot be run inside the chat session.\n\nPlease run `super-agent provider config` in a separate terminal, or use:\n`/provider set-key <provider> <key>` to set an API key directly.",
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/provider set-key ")) {
      const args = trimmedInput
        .replace("/provider set-key ", "")
        .trim()
        .split(" ");
      const providerId = args[0];
      const key = args.slice(1).join(" "); // Allow spaces? API keys usually don't have spaces but safe to join.

      if (!providerId || !key) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /provider set-key <provider> <api_key>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      if (settings.providers && settings.providers[providerId]) {
        // Update the specific provider's API key
        const newProviders = { ...settings.providers };
        newProviders[providerId] = {
          ...newProviders[providerId],
          api_key: key,
        };

        manager.updateUserSetting("providers", newProviders);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ API Key for ${providerId} updated.`,
            timestamp: new Date(),
          },
        ]);
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

    if (trimmedInput.startsWith("/provider use ")) {
      const providerId = trimmedInput.replace("/provider use ", "").trim();
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      if (settings.providers && settings.providers[providerId]) {
        const providerConfig = settings.providers[providerId];

        // Validate provider has API key
        if (
          !providerConfig?.api_key &&
          providerConfig?.provider !== "openai-compatible"
        ) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Provider '${providerId}' requires an API key. Use '/provider config ${providerId}' to configure.`,
              timestamp: new Date(),
            },
          ]);
          clearInput();
          return true;
        }

        try {
          manager.setActiveProvider(providerId);
          await agent.setProvider(providerId);
          setActiveProvider(providerId);

          // Suggest restart for certain providers
          const providerType = providerConfig.provider || providerId;
          const suggestRestart =
            providerType === "openai" ||
            providerType === "gemini" ||
            providerType === "anthropic";

          let restartMessage = "";
          if (suggestRestart) {
            restartMessage =
              "\n\nNote: This provider may require a full restart of the CLI to take effect.";
          }

          // Check if we need to update model configuration
          if (!providerConfig.model) {
            restartMessage +=
              "\n\nNo model specified for this provider. Consider setting one with '/model set <model>'.";
          }

          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Switched active provider to: ${providerId}${restartMessage}`,
              timestamp: new Date(),
            },
          ]);
        } catch (error: any) {
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `❌ Failed to switch provider: ${error.message}`,
              timestamp: new Date(),
            },
          ]);
        }
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Provider '${providerId}' not found. Use '/provider list' to see available providers.`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/provider set-account ")) {
      const args = trimmedInput
        .replace("/provider set-account ", "")
        .trim()
        .split(" ");
      const providerId = args[0];
      const accountId = args[1];

      if (!providerId || !accountId) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /provider set-account <provider> <account_id>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      if (settings.providers && settings.providers[providerId]) {
        const newProviders = { ...settings.providers };
        newProviders[providerId] = {
          ...newProviders[providerId],
          account_id: accountId,
        };
        manager.updateUserSetting("providers", newProviders);
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Account ID for ${providerId} updated.`,
            timestamp: new Date(),
          },
        ]);

        // Reload if active
        if (providerId === activeProvider) {
          try {
            await agent.setProvider(providerId);
          } catch (e) {}
        }
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

    if (trimmedInput === "/provider reset") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      // Reset to default provider and clear other configs
      const defaultProviders = {
        grok: {
          id: "grok",
          provider: "grok",
          model: "grok-code-fast-1",
          api_key: "",
          base_url: "https://api.x.ai/v1",
          default_model: "grok-code-fast-1",
        },
      };

      settings.active_provider = "grok";
      settings.providers = { ...settings.providers, ...defaultProviders };
      manager.saveUserSettings(settings);

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: "✅ Provider settings reset to defaults.",
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/provider list" || trimmedInput === "/provider ls") {
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const activeProvider = settings.active_provider;

      let output = "Configured providers:\n";
      Object.keys(settings.providers).forEach(id => {
        const provider = settings.providers[id];
        const isActive = id === activeProvider ? "★ " : "  ";
        const hasKey = provider.api_key ? "✓" : "✗";
        output += `${isActive}${id} (${provider.provider}) - ${hasKey} API Key - ${provider.model}\n`;
      });

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: output,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/provider info ")) {
      const providerId = trimmedInput.replace("/provider info ", "").trim();
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      if (!settings.providers || !settings.providers[providerId]) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Provider '${providerId}' not found.`,
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const provider = settings.providers[providerId];
      const isActive = providerId === settings.active_provider ? "Yes ★" : "No";

      let output = `Provider: ${providerId}\n`;
      output += `Type: ${provider.provider}\n`;
      output += `Active: ${isActive}\n`;
      output += `Model: ${provider.model}\n`;
      output += `Default Model: ${provider.default_model || "N/A"}\n`;
      output += `Base URL: ${provider.base_url || "Default"}\n`;
      output += `API Key: ${provider.api_key ? "Set (******)" : "Not set"}\n`;
      if (provider.account_id) {
        output += `Account ID: ${provider.account_id}\n`;
      }

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: output,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/provider set-url ")) {
      const args = trimmedInput
        .replace("/provider set-url ", "")
        .trim()
        .split(" ");
      const providerId = args[0];
      const url = args.slice(1).join(" "); // Allow spaces in URLs

      if (!providerId || !url) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /provider set-url <provider> <base_url>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      if (settings.providers && settings.providers[providerId]) {
        const newProviders = { ...settings.providers };
        newProviders[providerId] = {
          ...newProviders[providerId],
          base_url: url,
        };
        manager.updateUserSetting("providers", newProviders);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Base URL for ${providerId} updated to: ${url}`,
            timestamp: new Date(),
          },
        ]);

        // Reload if active
        if (providerId === activeProvider) {
          try {
            await agent.setProvider(providerId);
          } catch (e) {}
        }
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

    if (trimmedInput.startsWith("/provider remove ")) {
      const providerId = trimmedInput.replace("/provider remove ", "").trim();

      if (!providerId) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Usage: /provider remove <provider_id>",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();

      if (!settings.providers || !settings.providers[providerId]) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Provider '${providerId}' not found.`,
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      // Don't allow removing the active provider if it's the only one
      const providerCount = Object.keys(settings.providers).length;
      if (providerId === settings.active_provider && providerCount <= 1) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content:
              "❌ Cannot remove the only provider. Add another provider first.",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      const newProviders = { ...settings.providers };
      delete newProviders[providerId];
      manager.updateUserSetting("providers", newProviders);

      // If we removed the active provider, switch to another one
      if (providerId === settings.active_provider) {
        const remainingProviders = Object.keys(newProviders);
        if (remainingProviders.length > 0) {
          const newActive = remainingProviders[0];
          manager.setActiveProvider(newActive);
          try {
            await agent.setProvider(newActive);
          } catch (e) {}
        }
      }

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `✅ Provider '${providerId}' removed.`,
          timestamp: new Date(),
        },
      ]);
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

    if (trimmedInput === "/models list" || trimmedInput === "/models ls") {
      const modelNames = availableModels.map(m => m.model);
      const manager = getSettingsManager();
      const currentModel = manager.getCurrentModel();

      let output = "Available models:\n";
      modelNames.forEach(model => {
        const prefix = model === currentModel ? "★ " : "  ";
        output += `${prefix}${model}\n`;
      });
      output += `\nTotal: ${modelNames.length} models`;

      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: output,
          timestamp: new Date(),
        },
      ]);
      clearInput();
      return true;
    }

    if (trimmedInput === "/models refresh" || trimmedInput === "/models r") {
      setIsProcessing(true);
      const refreshEntry: ChatEntry = {
        type: "assistant",
        content: "🔄 Refreshing models from provider API...",
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, refreshEntry]);

      try {
        const models = await agent.fetchAvailableModels(true);
        setDynamicModels(models);

        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `✓ Refreshed ${models.length} models from provider API`,
            timestamp: new Date(),
          },
        ]);
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Failed to refresh models: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/chat ")) {
      const args = trimmedInput.replace("/chat ", "").split(" ");
      const action = args[0];
      const name = args.slice(1).join(" ");
      const chatManager = getChatManager();

      try {
        if (action === "save") {
          if (!name) {
            throw new Error("Chat name is required.");
          }
          await chatManager.saveChat(name, chatHistory);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Chat saved as '${name}'.`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "load") {
          if (!name) {
            throw new Error("Chat name is required.");
          }
          const history = await chatManager.loadChat(name);
          setChatHistory(history);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Chat '${name}' loaded.`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "list") {
          const chats = await chatManager.listChats();
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `Saved Chats:\n${chats.length ? chats.map(c => `- ${c}`).join("\n") : "No saved chats."}`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "delete") {
          if (!name) {
            throw new Error("Chat name is required.");
          }
          await chatManager.deleteChat(name);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Chat '${name}' deleted.`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "clear") {
          // Same as /clear
          setChatHistory([]);
          setIsProcessing(false);
          setIsStreaming(false);
          setTokenCount(0);
          setProcessingTime(0);
          processingStartTime.current = 0;
          ConfirmationService.getInstance().resetSession();
          clearInput();
          resetHistory();
          return true;
        } else {
          throw new Error(`Unknown chat action: ${action}`);
        }
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Error: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/import ")) {
      const args = trimmedInput.replace("/import ", "").split(" ");
      const type = args[0];
      const source = args[1];

      if (!type || !source) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content:
              "❌ Usage: /import <type> <source>\nTypes: agents, skills, hooks\nSources: gemini, claude, kilo, or path",
            timestamp: new Date(),
          },
        ]);
        clearInput();
        return true;
      }

      setIsProcessing(true);
      setChatHistory(prev => [
        ...prev,
        {
          type: "assistant",
          content: `Importing ${type} from ${source}...`,
          timestamp: new Date(),
        },
      ]);

      try {
        const { resolveSourcePath } = await import("../utils/file-utils");
        const { AgentsManager } = await import("../agents/manager");
        const { SkillsManager } = await import("../skills/manager");
        const { getSettingsManager } =
          await import("../utils/settings-manager");
        const fs = await import("fs-extra");
        const path = await import("path");

        const sourcePath = resolveSourcePath(source);

        if (type === "agents") {
          const agentsDir = path.join(sourcePath, "agents");
          if (!(await fs.pathExists(agentsDir))) {
            throw new Error(`Agents directory not found at ${agentsDir}`);
          }
          const files = await fs.readdir(agentsDir);
          const manager = AgentsManager.getInstance();
          let count = 0;
          for (const file of files) {
            if (file.endsWith(".json")) {
              try {
                const content = await fs.readJson(path.join(agentsDir, file));
                const agentConfig = {
                  name: content.name || path.parse(file).name,
                  role: content.role || "Assistant",
                  description: content.description || "Imported agent",
                  model: content.model,
                  tools: content.tools,
                  temperature: content.temperature,
                  systemPrompt:
                    content.systemPrompt ||
                    content.system_prompt ||
                    content.prompt,
                };
                await manager.createAgent(agentConfig);
                count++;
              } catch (e) {
                /* ignore */
              }
            }
          }
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✅ Imported ${count} agents.`,
              timestamp: new Date(),
            },
          ]);
        } else if (type === "skills") {
          const skillsDir = path.join(sourcePath, "skills");
          if (!(await fs.pathExists(skillsDir))) {
            throw new Error(`Skills directory not found at ${skillsDir}`);
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
                const name = path.parse(file).name;
                await manager.saveSkill(name, content);
                count++;
              } catch (e) {
                /* ignore */
              }
            }
          }
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✅ Imported ${count} skills.`,
              timestamp: new Date(),
            },
          ]);
        } else if (type === "hooks") {
          const settingsFile =
            source.toLowerCase() === "claude"
              ? "settings.local.json"
              : "settings.json";
          const fullPath = path.join(sourcePath, settingsFile);

          if (!(await fs.pathExists(fullPath))) {
            throw new Error(`Settings file not found at ${fullPath}`);
          }
          const settings = await fs.readJson(fullPath);
          if (settings.hooks) {
            const manager = getSettingsManager();
            const currentHooks = manager.getUserSetting("hooks") || {};
            const mergedHooks = { ...currentHooks, ...settings.hooks };
            manager.updateUserSetting("hooks", mergedHooks);
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: `✅ Imported ${Object.keys(settings.hooks).length} hooks.`,
                timestamp: new Date(),
              },
            ]);
          } else {
            setChatHistory(prev => [
              ...prev,
              {
                type: "assistant",
                content: "⚠️ No hooks found in settings file.",
                timestamp: new Date(),
              },
            ]);
          }
        } else {
          throw new Error(`Unknown import type: ${type}`);
        }
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Import failed: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsProcessing(false);
      }

      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/plugin ")) {
      const args = trimmedInput.replace("/plugin ", "").split(" ");
      const action = args[0];
      const pluginManager = getPluginManager();

      try {
        if (action === "list") {
          const plugins = pluginManager.getPlugins();
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `Installed Plugins:\n${plugins.length ? plugins.map(p => `- ${p.name} (v${p.version})`).join("\n") : "No plugins installed."}`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "install") {
          const pathOrName = args[1];
          if (!pathOrName) {
            throw new Error("Usage: /plugin install <path>");
          }

          setIsProcessing(true);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `Installing plugin from ${pathOrName}...`,
              timestamp: new Date(),
            },
          ]);

          await pluginManager.installPlugin(pathOrName);
          // We need to load it to be active immediately?
          await pluginManager.loadPlugin(pathOrName, agent);

          setIsProcessing(false);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Plugin installed from ${pathOrName}`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "remove") {
          const name = args[1];
          if (!name) {
            throw new Error("Usage: /plugin remove <name>");
          }

          await pluginManager.removePlugin(name);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Plugin removed: ${name}`,
              timestamp: new Date(),
            },
          ]);
        } else {
          throw new Error(`Unknown plugin action: ${action}`);
        }
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ Plugin Error: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
      }
      clearInput();
      return true;
    }

    if (trimmedInput.startsWith("/mcp ")) {
      const args = trimmedInput.replace("/mcp ", "").split(" ");
      const action = args[0];
      const mcpManager = getMCPManager();

      try {
        if (action === "list") {
          const servers = mcpManager.getServers();
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `Active MCP Servers:\n${servers.length ? servers.map(s => `- ${s}`).join("\n") : "No active servers."}`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "reload") {
          setIsProcessing(true);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: "Reloading MCP servers...",
              timestamp: new Date(),
            },
          ]);
          await mcpManager.shutdown();
          await initializeMCPServers();
          setIsProcessing(false);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: "✓ MCP servers reloaded.",
              timestamp: new Date(),
            },
          ]);
        } else if (action === "add") {
          // Usage: /mcp add <name> <command> [args...]
          if (args.length < 3) {
            throw new Error("Usage: /mcp add <name> <command> [args...]");
          }
          const name = args[1];
          const command = args[2];
          const commandArgs = args.slice(3);

          await mcpManager.addServer({
            name,
            transport: {
              type: "stdio",
              command,
              args: commandArgs,
            },
          });

          // Also persist? The current addServer doesn't persist to .mcp.json automatically
          // Use config.ts logic if persistence is desired. For now, runtime only or via manual config edit
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Added MCP server '${name}'.`,
              timestamp: new Date(),
            },
          ]);
        } else if (action === "remove") {
          const name = args[1];
          if (!name) {
            throw new Error("Usage: /mcp remove <name>");
          }
          await mcpManager.removeServer(name);
          setChatHistory(prev => [
            ...prev,
            {
              type: "assistant",
              content: `✓ Removed MCP server '${name}'.`,
              timestamp: new Date(),
            },
          ]);
        } else {
          throw new Error(`Unknown MCP action: ${action}`);
        }
      } catch (error: any) {
        setChatHistory(prev => [
          ...prev,
          {
            type: "assistant",
            content: `❌ MCP Error: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
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

    if (trimmedInput.startsWith("!")) {
      const command = trimmedInput.slice(1).trim();
      if (!command) {
        clearInput();
        return true;
      }

      const userEntry: ChatEntry = {
        type: "user",
        content: trimmedInput,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, userEntry]);

      try {
        const result = await agent.executeBashCommand(command);

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
              arguments: JSON.stringify({ command }),
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

    // Check if input matches a custom command
    if (userInput.startsWith("/")) {
      const commandName = userInput.split(" ")[0].slice(1);
      const manager = getSettingsManager();
      const settings = manager.loadUserSettings();
      const customCommands = settings.custom_commands || {};

      if (customCommands[commandName]) {
        // Replace the command with its prompt
        const args = userInput.split(" ").slice(1);
        resolvedInput = customCommands[commandName];
        // If there are arguments, append them to the custom prompt
        if (args.length > 0) {
          resolvedInput += " " + args.join(" ");
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
    showProviderSelection,
    selectedProviderIndex,
    showConfigViewer,
  };
}
