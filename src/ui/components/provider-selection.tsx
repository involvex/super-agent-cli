import { Box, Text } from "ink";

interface ProviderInfo {
  id: string;
  name: string;
  isActive: boolean;
  hasApiKey: boolean;
  model?: string;
}

interface ProviderSelectionProps {
  providers: ProviderInfo[];
  selectedIndex: number;
  isVisible: boolean;
}

export function ProviderSelection({
  providers,
  selectedIndex,
  isVisible,
}: ProviderSelectionProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      width={
        process.stdout.columns ? Math.min(80, process.stdout.columns - 4) : 80
      }
    >
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          🔌 Select AI Provider
        </Text>
      </Box>

      <Box flexDirection="column">
        {providers.map((provider, index) => (
          <Box key={provider.id} paddingLeft={1}>
            <Box width={3}>
              <Text>{index === selectedIndex ? "❯" : " "}</Text>
            </Box>
            <Text
              color={index === selectedIndex ? "white" : "white"}
              backgroundColor={index === selectedIndex ? "cyan" : undefined}
              bold={index === selectedIndex}
            >
              {provider.id}
              {provider.isActive && " ★"}
            </Text>
            <Box marginLeft={2}>
              <Text color="gray">
                {provider.hasApiKey ? "✓" : "✗"} API Key
                {provider.model ? ` | ${provider.model}` : ""}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>

      {providers.length === 0 && (
        <Box padding={1}>
          <Text color="gray" italic>
            No providers configured. Check ~/.super-agent/settings.json
          </Text>
        </Box>
      )}

      <Box
        marginTop={1}
        borderStyle="single"
        borderTop={true}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter select • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
