import { ToolResult } from "../../types/index";
import { Box, Text } from "ink";

interface CommandEntry {
  command: string;
  result: ToolResult;
}

interface CommandHistoryProps {
  history: CommandEntry[];
}

export function CommandHistory({ history }: CommandHistoryProps) {
  const renderResult = (result: ToolResult) => {
    if (result.success) {
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green">✓ Success</Text>
          {result.output && (
            <Box marginLeft={2}>
              <Text>{result.output}</Text>
            </Box>
          )}
        </Box>
      );
    } else {
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red">✗ Error</Text>
          {result.error && (
            <Box marginLeft={2}>
              <Text color="red">{result.error}</Text>
            </Box>
          )}
        </Box>
      );
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {history.slice(-10).map((entry, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="blue">$ </Text>
            <Text>{entry.command}</Text>
          </Box>
          {renderResult(entry.result)}
        </Box>
      ))}
    </Box>
  );
}
