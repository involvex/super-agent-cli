import { Box, Text } from "ink";

interface ConfigInfo {
  activeProvider: string;
  apiKeySet: boolean;
  baseUrl?: string;
  model?: string;
  theme: string;
}

interface ConfigViewerProps {
  config: ConfigInfo;
  isVisible?: boolean;
  onClose?: () => void;
}

export function ConfigViewer({
  config,
  isVisible = true,
  onClose,
}: ConfigViewerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      width={
        process.stdout.columns ? Math.min(80, process.stdout.columns - 4) : 80
      }
    >
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          ⚙️ Current Configuration
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Box width={20}>
            <Text color="cyan" bold>
              Active Provider:
            </Text>
          </Box>
          <Text color="white">{config.activeProvider}</Text>
        </Box>

        <Box marginBottom={1}>
          <Box width={20}>
            <Text color="cyan" bold>
              API Key:
            </Text>
          </Box>
          <Text color={config.apiKeySet ? "green" : "red"}>
            {config.apiKeySet ? "✓ Set (hidden)" : "✗ Not set"}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Box width={20}>
            <Text color="cyan" bold>
              Base URL:
            </Text>
          </Box>
          <Text color="white">{config.baseUrl || "(default)"}</Text>
        </Box>

        <Box marginBottom={1}>
          <Box width={20}>
            <Text color="cyan" bold>
              Model:
            </Text>
          </Box>
          <Text color="white">{config.model || "(default)"}</Text>
        </Box>

        <Box>
          <Box width={20}>
            <Text color="cyan" bold>
              Theme:
            </Text>
          </Box>
          <Text color="white">{config.theme}</Text>
        </Box>
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color="gray" italic>
          Use /provider to switch providers • /models to change model
        </Text>
      </Box>

      <Box
        marginTop={1}
        borderStyle="single"
        borderTop={true}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color="gray" dimColor>
          Esc to close
        </Text>
      </Box>
    </Box>
  );
}
