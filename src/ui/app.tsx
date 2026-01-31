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
import { CommandHistory } from "./components/command-history";
import { CommandInput } from "./components/command-input";
import { CommandHelp } from "./components/command-help";
import { Header } from "./components/header";

interface Props {
  agent: Agent;
}

export default function App({ agent }: Props) {
  const [input, setInput] = useState("");
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);

  const confirmationService = useMemo(
    () => ConfirmationService.getInstance(),
    [],
  );

  const { history, isProcessing, setIsProcessing, addEntry } =
    useCommandHistory();

  const handleSubmit = async (command: string) => {
    setIsProcessing(true);
    const result = await agent.processCommand(command);
    addEntry(command, result);
    setIsProcessing(false);
  };

  useKeyboardInput(
    input,
    setInput,
    handleSubmit,
    isProcessing,
    confirmationOptions,
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

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <CommandHelp />
      <CommandHistory history={history} />
      <CommandInput input={input} isProcessing={isProcessing} />
    </Box>
  );
}
