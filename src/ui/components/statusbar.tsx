import { getSettingsManager } from "../../utils/settings-manager";
import { getLogger } from "../../utils/logger";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  currentModel?: string;
  toolCallsCount?: number;
  isProcessing?: boolean;
  tokenCount?: number;
  contextSize?: number;
}

interface GitStatus {
  branch: string;
  changes: number;
}

interface SystemStats {
  memory: NodeJS.MemoryUsage;
  cpu: number;
}

export function StatusBar({
  currentModel = "unknown",
  toolCallsCount = 0,
  isProcessing = false,
  tokenCount = 0,
  contextSize = 0,
}: StatusBarProps) {
  const [config, setConfig] = useState(
    getSettingsManager().getEffectiveSettings().ui.statusbar_config,
  );
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const settings = getSettingsManager().getEffectiveSettings();
    if (settings.ui.statusbar_config) {
      setConfig(settings.ui.statusbar_config);
    }
  }, []);

  useEffect(() => {
    // Fetch git status if enabled
    if (config?.show_git_status) {
      fetchGitStatus();
    }

    // Update system stats periodically if enabled
    if (config?.show_memory || config?.show_cpu) {
      const updateStats = () => {
        setSystemStats({
          memory: process.memoryUsage(),
          cpu: process.cpuUsage().user / 1000000, // Convert to seconds
        });
      };

      updateStats();
      const interval = setInterval(updateStats, 5000);
      return () => clearInterval(interval);
    }
  }, [config]);

  const fetchGitStatus = async () => {
    try {
      const logger = getLogger();
      const { execSync } = await import("child_process");

      try {
        const branch = execSync("git rev-parse --abbrev-ref HEAD", {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        }).trim();

        const status = execSync("git status --porcelain", {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        });

        const changes = status
          .trim()
          .split("\n")
          .filter(line => line.trim()).length;

        setGitStatus({ branch, changes });
      } catch {
        logger.debug("Not a git repository or git not available");
      }
    } catch (error) {
      const logger = getLogger();
      logger.error("Failed to fetch git status:", error);
    }
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  const formatContext = (context: number): string => {
    if (context >= 1000000) {
      return `${(context / 1000000).toFixed(1)}M`;
    }
    if (context >= 1000) {
      return `${(context / 1000).toFixed(1)}k`;
    }
    return context.toString();
  };

  // Build statusbar items based on config
  const items: React.ReactNode[] = [];

  if (config?.show_model) {
    items.push(
      <Box key="model">
        <Text bold color="cyan">
          {currentModel}
        </Text>
      </Box>,
    );
  }

  if (config?.show_tool_calls && toolCallsCount > 0) {
    items.push(
      <Box key="separator-1" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="tool-calls" marginLeft={1}>
        <Text color="yellow">🔧 {toolCallsCount}</Text>
      </Box>,
    );
  }

  if (config?.show_git_status && gitStatus) {
    items.push(
      <Box key="separator-2" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="git" marginLeft={1}>
        <Text color={gitStatus.changes > 0 ? "red" : "green"}>
          {gitStatus.branch}
          {gitStatus.changes > 0 && ` +${gitStatus.changes}`}
        </Text>
      </Box>,
    );
  }

  if (config?.show_memory && systemStats) {
    items.push(
      <Box key="separator-3" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="memory" marginLeft={1}>
        <Text color="blue">💾 {formatMemory(systemStats.memory.heapUsed)}</Text>
      </Box>,
    );
  }

  if (config?.show_cpu) {
    items.push(
      <Box key="separator-4" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="cpu" marginLeft={1}>
        <Text color="magenta">⚡ CPU</Text>
      </Box>,
    );
  }

  if (config?.show_tokens && tokenCount > 0) {
    items.push(
      <Box key="separator-5" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="tokens" marginLeft={1}>
        <Text color="green">🪙 {formatTokens(tokenCount)}</Text>
      </Box>,
    );
  }

  if (config?.show_context && contextSize > 0) {
    items.push(
      <Box key="separator-6" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="context" marginLeft={1}>
        <Text color="gray">📏 {formatContext(contextSize)}</Text>
      </Box>,
    );
  }

  if (isProcessing) {
    items.push(
      <Box key="separator-7" marginLeft={1}>
        <Text dimColor>|</Text>
      </Box>,
      <Box key="processing" marginLeft={1}>
        <Text color="yellow">⏳ Processing...</Text>
      </Box>,
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width="100%"
      justifyContent="flex-start"
    >
      {items}
    </Box>
  );
}

export default StatusBar;
