import { Box, Text } from "ink";

export function CommandHelp() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>
        Available commands: view, str_replace, create, insert, undo_edit, bash,
        help
      </Text>
      <Text dimColor>
        Type 'help' for detailed usage, 'exit' or Ctrl+C to quit
      </Text>
    </Box>
  );
}
