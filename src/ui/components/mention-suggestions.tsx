import { FileEntry, filterFileEntries } from "../../utils/file-utils";
import { useMemo } from "react";
import { Box, Text } from "ink";

interface MentionSuggestionsProps {
  suggestions: FileEntry[];
  query: string;
  selectedIndex: number;
  isVisible: boolean;
}

export function MentionSuggestions({
  suggestions,
  query,
  selectedIndex,
  isVisible,
}: MentionSuggestionsProps) {
  if (!isVisible) {
    return null;
  }

  const filteredSuggestions = useMemo(
    () => filterFileEntries(suggestions, query),
    [suggestions, query],
  );

  return (
    <Box marginTop={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Mention file or folder (@):
        </Text>
      </Box>
      {filteredSuggestions.map((suggestion, index) => (
        <Box key={index} paddingLeft={1}>
          <Text
            color={
              index === selectedIndex
                ? "black"
                : suggestion.isDirectory
                  ? "blue"
                  : "white"
            }
            backgroundColor={index === selectedIndex ? "cyan" : undefined}
          >
            {suggestion.isDirectory ? "📁" : "📄"} {suggestion.path}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter/Tab select • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
