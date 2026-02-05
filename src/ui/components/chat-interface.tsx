import {
  ConfirmationOptions,
  ConfirmationService,
} from "../../utils/confirmation-service";
import { useInputHandler } from "../../hooks/use-input-handler";
import { getSessionManager } from "../../utils/session-manager";
import { ChatEntry, SuperAgent } from "../../agent/super-agent";
import { MentionSuggestions } from "./mention-suggestions";
import { CommandSuggestions } from "./command-suggestions";
import { ProviderSelection } from "./provider-selection";
import ConfirmationDialog from "./confirmation-dialog";
import { useEffect, useRef, useState } from "react";
import { ModelSelection } from "./model-selection";
import { LoadingSpinner } from "./loading-spinner";
import { CommandPalette } from "./command-palette";
import { getLogger } from "../../utils/logger";
import { ConfigViewer } from "./config-viewer";
import { ChatHistory } from "./chat-history";
import ApiKeyInput from "./api-key-input";
import { MCPStatus } from "./mcp-status";
import { ChatInput } from "./chat-input";
import StatusBar from "./statusbar";
import { Box, Text } from "ink";

import cfonts from "cfonts";

interface ChatInterfaceProps {
  agent?: SuperAgent;
  initialMessage?: string;
  resumeSession?: boolean;
  debugMode?: boolean;
}

// Main chat component that handles input when agent is available
function ChatInterfaceWithAgent({
  agent,
  initialMessage,
  resumeSession,
  debugMode,
}: {
  agent: SuperAgent;
  initialMessage?: string;
  resumeSession?: boolean;
  debugMode?: boolean;
}) {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);
  const [toolCallsCount, setToolCallsCount] = useState(0);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const scrollRef = useRef<any>();
  const processingStartTime = useRef<number>(0);

  const confirmationService = ConfirmationService.getInstance();

  const {
    input,
    cursorPosition,
    showCommandSuggestions,
    selectedCommandIndex,
    showModelSelection,
    selectedModelIndex,
    availableModels,
    autoEditEnabled,
    agentMode,
    showMentionSuggestions,
    commandSuggestions,
    showCommandPalette,
    commandPaletteQuery,
    selectedPaletteIndex,
    mentionSuggestions, // Added this based on the usage in the JSX
    mentionQuery, // Added this based on the usage in the JSX
    selectedMentionIndex, // Added this based on the usage in the JSX
    showProviderSelection,
    selectedProviderIndex,
    showConfigViewer,
  } = useInputHandler({
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
    isConfirmationActive: !!confirmationOptions,
  });

  useEffect(() => {
    // Only clear console on non-Windows platforms or if not PowerShell
    // Windows PowerShell can have issues with console.clear() causing flickering
    const isWindows = process.platform === "win32";
    const isPowerShell =
      process.env.ComSpec?.toLowerCase().includes("powershell") ||
      process.env.PSModulePath !== undefined;

    if (!isWindows || !isPowerShell) {
      console.clear();
    }

    // Add top padding
    console.log("    ");

    // Generate logo with margin to match Ink paddingX={2}
    const logoOutput = cfonts.render("SUPER|AGENT", {
      font: "3d",
      align: "left",
      colors: ["magenta", "gray"],
      space: true,
      maxLength: "0",
      gradient: ["magenta", "cyan"],
      independentGradient: false,
      transitionGradient: true,
      env: "node",
    });

    // Add horizontal margin (2 spaces) to match Ink paddingX={2}
    // const logoLines = (
    //   logoOutput as unknown as { string: string }
    // ).string.split("\n");
    // logoLines.forEach((line: string) => {
    //   if (line.trim()) {
    //     console.log(" " + line); // Add 2 spaces for horizontal margin
    //   } else {
    //     console.log(line); // Keep empty lines as-is
    //   }
    // });

    console.log(" "); // Spacing after logo

    // Initialize logger with debug mode
    const logger = getLogger();
    if (debugMode) {
      logger.setDebugMode(true);
      logger.debug("Debug mode enabled in ChatInterface");
    }

    setChatHistory([]);
  }, [debugMode]);

  // Load previous session if resumeSession is enabled
  useEffect(() => {
    if (resumeSession) {
      const logger = getLogger();
      logger.debug("Resuming previous session...");

      const sessionManager = getSessionManager();
      const workingDirectory = process.cwd();

      sessionManager
        .getOrCreateSession(workingDirectory)
        .then(session => {
          logger.debug("Session loaded:", session);
          if (session.messages && session.messages.length > 0) {
            // Convert session messages to ChatEntry format
            // Filter out system messages and only keep user/assistant
            const entries: ChatEntry[] = session.messages
              .filter(msg => msg.role === "user" || msg.role === "assistant")
              .map(msg => ({
                type: msg.role as "user" | "assistant",
                content: msg.content,
                timestamp: new Date(msg.timestamp),
              }));
            setChatHistory(entries);
            logger.debug(`Restored ${entries.length} messages from session`);
          }
        })
        .catch(error => {
          logger.error("Failed to load session:", error);
        });
    }
  }, [resumeSession]);

  // Check if statusbar should be shown based on settings
  useEffect(() => {
    const { getSettingsManager } = require("../../utils/settings-manager");
    const manager = getSettingsManager();
    const settings = manager.getEffectiveSettings();
    setShowStatusBar(settings.ui.show_statusbar || false);
  }, []);

  // Track tool calls count
  useEffect(() => {
    const count = chatHistory.filter(
      entry => entry.type === "tool_call" || entry.type === "tool_result",
    ).length;
    setToolCallsCount(count);
  }, [chatHistory]);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (scrollRef.current && chatHistory.length > 0) {
      // Force Ink to re-render with new content at the bottom
      // The key change on the parent Box combined with this ensures proper scrolling
      const logger = getLogger();
      logger.debug("Chat history updated, ensuring scroll to bottom");
    }
  }, [chatHistory]);

  // Process initial message if provided (streaming for faster feedback)
  useEffect(() => {
    if (initialMessage && agent) {
      const userEntry: ChatEntry = {
        type: "user",
        content: initialMessage,
        timestamp: new Date(),
      };
      setChatHistory([userEntry]);

      const processInitialMessage = async () => {
        setIsProcessing(true);
        setIsStreaming(true);

        try {
          let streamingEntry: ChatEntry | null = null;
          for await (const chunk of agent.processUserMessageStream(
            initialMessage,
          )) {
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
              case "done":
                if (streamingEntry) {
                  setChatHistory(prev =>
                    prev.map(entry =>
                      entry.isStreaming
                        ? { ...entry, isStreaming: false }
                        : entry,
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

      processInitialMessage();
    }
  }, [initialMessage, agent]);

  useEffect(() => {
    const handleConfirmationRequest = (options: ConfirmationOptions) => {
      setConfirmationOptions(options);
    };

    confirmationService.on("confirmation-requested", handleConfirmationRequest);

    return () => {
      confirmationService.off(
        "confirmation-requested",
        handleConfirmationRequest,
      );
    };
  }, [confirmationService]);

  useEffect(() => {
    if (!isProcessing && !isStreaming) {
      setProcessingTime(0);
      return;
    }

    if (processingStartTime.current === 0) {
      processingStartTime.current = Date.now();
    }

    const interval = setInterval(() => {
      setProcessingTime(
        Math.floor((Date.now() - processingStartTime.current) / 1000),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, isStreaming]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);

    // Reset processing states when operation is cancelled
    setIsProcessing(false);
    setIsStreaming(false);
    setTokenCount(0);
    setProcessingTime(0);
    processingStartTime.current = 0;
  };

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Show tips only when no chat history and no confirmation dialog */}
      {chatHistory.length === 0 && !confirmationOptions && (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="cyan" bold>
            Tips for getting started:
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="gray">
              1. Ask questions, edit files, or run commands.
            </Text>
            <Text color="gray">2. Be specific for the best results.</Text>
            <Text color="gray">
              3. Create SUPER_AGENT.md files to customize your interactions.
            </Text>
            <Text color="gray">
              4. Press Shift+Tab to toggle auto-edit mode.
            </Text>
            <Text color="gray">5. /help for more information.</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          Type your request in natural language. Ctrl+C to clear, 'exit' to
          quit.
        </Text>
      </Box>

      {/* Status Bar */}
      {showStatusBar && (
        <Box marginBottom={1}>
          <StatusBar
            currentModel={agent.getCurrentModel()}
            toolCallsCount={toolCallsCount}
            isProcessing={isProcessing}
            tokenCount={tokenCount}
            contextSize={chatHistory.reduce(
              (acc, entry) => acc + entry.content.length,
              0,
            )}
          />
        </Box>
      )}

      <Box flexDirection="column" ref={scrollRef}>
        <ChatHistory
          entries={chatHistory}
          isConfirmationActive={!!confirmationOptions}
        />
      </Box>

      {/* Show confirmation dialog if one is pending */}
      {confirmationOptions && (
        <ConfirmationDialog
          operation={confirmationOptions.operation}
          filename={confirmationOptions.filename}
          showVSCodeOpen={confirmationOptions.showVSCodeOpen}
          content={confirmationOptions.content}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}

      {!confirmationOptions && (
        <>
          {showCommandPalette ? (
            <Box flexDirection="column" marginTop={1}>
              <CommandPalette
                files={mentionSuggestions}
                query={commandPaletteQuery}
                selectedIndex={selectedPaletteIndex}
                isVisible={showCommandPalette}
              />
            </Box>
          ) : showProviderSelection ? (
            <Box flexDirection="column" marginTop={1}>
              <ProviderSelection
                providers={(() => {
                  const {
                    getSettingsManager,
                  } = require("../../utils/settings-manager");
                  const manager = getSettingsManager();
                  const settings = manager.loadUserSettings();
                  const active = settings.active_provider;
                  return Object.keys(settings.providers || {}).map(id => ({
                    id,
                    name: id,
                    isActive: id === active,
                    hasApiKey: !!settings.providers[id]?.api_key,
                    model: settings.providers[id]?.model,
                  }));
                })()}
                selectedIndex={selectedProviderIndex}
                isVisible={showProviderSelection}
              />
            </Box>
          ) : showConfigViewer ? (
            <Box flexDirection="column" marginTop={1}>
              <ConfigViewer
                config={(() => {
                  const {
                    getSettingsManager,
                  } = require("../../utils/settings-manager");
                  const manager = getSettingsManager();
                  const settings = manager.loadUserSettings();
                  const activeProvider = settings.active_provider;
                  const activeConfig = settings.providers[activeProvider];
                  return {
                    activeProvider,
                    apiKeySet: !!activeConfig?.api_key,
                    baseUrl: activeConfig?.base_url,
                    model: activeConfig?.model,
                    theme: settings.ui.theme,
                  };
                })()}
                isVisible={showConfigViewer}
              />
            </Box>
          ) : showModelSelection ? (
            <Box flexDirection="column" marginTop={1}>
              <ModelSelection
                models={availableModels}
                selectedIndex={selectedModelIndex}
                isVisible={showModelSelection}
                currentModel={agent.getCurrentModel()}
              />
            </Box>
          ) : (
            <>
              <LoadingSpinner
                isActive={isProcessing || isStreaming}
                processingTime={processingTime}
                tokenCount={tokenCount}
              />

              <ChatInput
                input={input}
                cursorPosition={cursorPosition}
                isProcessing={isProcessing}
                isStreaming={isStreaming}
              />

              <Box flexDirection="row" marginTop={1} flexWrap="wrap">
                <Box marginRight={2}>
                  <Text color="cyan">
                    {autoEditEnabled ? "🚀" : "⏸"} yolo:{" "}
                    {autoEditEnabled ? "on" : "off"}{" "}
                  </Text>
                  <Text color="gray" dimColor>
                    (ctrl+y)
                  </Text>
                </Box>

                <Box marginRight={2}>
                  <Text
                    color={
                      agentMode === "plan"
                        ? "cyan"
                        : agentMode === "debug"
                          ? "magenta"
                          : "green"
                    }
                    bold
                  >
                    ◈ {agentMode.toUpperCase()}
                  </Text>
                  <Text color="gray" dimColor>
                    {" "}
                    (shift+tab)
                  </Text>
                </Box>

                <Box marginRight={2}>
                  <Text color="magenta">🔍 palette </Text>
                  <Text color="gray" dimColor>
                    (ctrl+p)
                  </Text>
                </Box>

                <Box marginRight={2}>
                  <Text color="cyan">🐚 shell </Text>
                  <Text color="gray" dimColor>
                    (!)
                  </Text>
                </Box>

                <Box marginRight={2}>
                  <Text color="yellow">≋ {agent.getCurrentModel()}</Text>
                </Box>

                <MCPStatus />
              </Box>

              <MentionSuggestions
                suggestions={mentionSuggestions}
                query={mentionQuery}
                selectedIndex={selectedMentionIndex}
                isVisible={showMentionSuggestions}
              />

              <CommandSuggestions
                suggestions={commandSuggestions}
                input={input}
                selectedIndex={selectedCommandIndex}
                isVisible={showCommandSuggestions}
              />
            </>
          )}
        </>
      )}
    </Box>
  );
}

// Main component that handles API key input or chat interface
export default function ChatInterface({
  agent,
  initialMessage,
  resumeSession,
  debugMode,
}: ChatInterfaceProps) {
  const [currentAgent, setCurrentAgent] = useState<SuperAgent | null>(
    agent || null,
  );

  const handleApiKeySet = (newAgent: SuperAgent) => {
    setCurrentAgent(newAgent);
  };

  if (!currentAgent) {
    return <ApiKeyInput onApiKeySet={handleApiKeySet} />;
  }

  return (
    <ChatInterfaceWithAgent
      agent={currentAgent}
      initialMessage={initialMessage}
      resumeSession={resumeSession}
      debugMode={debugMode}
    />
  );
}
