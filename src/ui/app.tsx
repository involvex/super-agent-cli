import {
  ConfirmationService,
  ConfirmationOptions,
} from "../utils/confirmation-service";
import ConfirmationDialog from "./components/confirmation-dialog";
import React, { useState, useEffect, useMemo } from "react";
import { ToolResult } from "../types/index";
import { Agent } from "../agent/index";
import { Box } from "ink";

import { useCommandHistory } from "../hooks/use-command-history";
import { useKeyboardInput } from "../hooks/use-keyboard-input";
import { getSettingsManager } from "../utils/settings-manager";
import { CommandHistory } from "./components/command-history";
import { ConfigViewer } from "./components/config-viewer";
import { CommandInput } from "./components/command-input";
import { CommandHelp } from "./components/command-help";
import { StatusBar } from "./components/statusbar";
import { Header } from "./components/header";

interface Props {
  agent: Agent;
}

export default function App({ agent }: Props) {
  const [input, setInput] = useState("");
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [toolCallsCount, setToolCallsCount] = useState(0);

  const confirmationService = useMemo(
    () => ConfirmationService.getInstance(),
    [],
  );

  const { history, isProcessing, setIsProcessing, addEntry } =
    useCommandHistory();

  const handleSubmit = async (command: string) => {
    // Handle slash commands
    if (command.trim() === "/settings" || command.trim() === "/config") {
      setShowConfig(true);
      return;
    }

    setIsProcessing(true);
    const result = await agent.processCommand(command);
    addEntry(command, result);
    setIsProcessing(false);
  };

  const currentSettings = getSettingsManager().getEffectiveSettings();
  const configInfo = {
    activeProvider: currentSettings.active_provider || "grok",
    apiKeySet: !!getSettingsManager().getApiKey(),
    baseUrl:
      currentSettings.providers?.[currentSettings.active_provider || "grok"]
        ?.base_url,
    model:
      currentSettings.providers?.[currentSettings.active_provider || "grok"]
        ?.model,
    theme: currentSettings.ui?.theme || "zinc",
  };

  useKeyboardInput(
    input,
    setInput,
    handleSubmit,
    isProcessing,
    confirmationOptions,
    () => {
      if (showConfig) {
        setShowConfig(false);
      }
    },
  );
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
    confirmationService.resetSession();
  }, [confirmationService]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);
  };

  if (confirmationOptions) {
    return (
      <ConfirmationDialog
        operation={confirmationOptions.operation}
        filename={confirmationOptions.filename}
        showVSCodeOpen={confirmationOptions.showVSCodeOpen}
        onConfirm={handleConfirmation}
        onReject={handleRejection}
      />
    );
  }

  if (showConfig) {
    return (
      <ConfigViewer config={configInfo} onClose={() => setShowConfig(false)} />
    );
  }

  return (
    <Box flexDirection="column" padding={1} height="100%">
      <Box flexDirection="column" flexGrow={1}>
        <Header />
        <CommandHelp />
        <CommandHistory history={history} />
      </Box>

      <StatusBar
        currentModel={getSettingsManager().getCurrentModel()}
        isProcessing={isProcessing}
        tokenCount={tokenCount}
        toolCallsCount={toolCallsCount}
        contextSize={0} // TODO: Hook up real context size
      />

      <CommandInput input={input} isProcessing={isProcessing} />
    </Box>
  );
}
