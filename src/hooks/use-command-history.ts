import { useState, useCallback } from "react";
import { ToolResult } from "../types/index";

interface CommandEntry {
  command: string;
  result: ToolResult;
}

export function useCommandHistory() {
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addEntry = useCallback((command: string, result: ToolResult) => {
    setHistory(prev => [...prev, { command, result }]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    isProcessing,
    setIsProcessing,
    addEntry,
    clearHistory,
  };
}
