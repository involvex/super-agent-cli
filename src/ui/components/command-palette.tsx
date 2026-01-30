import { FileEntry, filterFileEntries } from "../../utils/file-utils";
import { useMemo } from "react";
import { Box, Text } from "ink";

interface CommandPaletteProps {
  files: FileEntry[];
  query: string;
  selectedIndex: number;
  isVisible: boolean;
}

export function CommandPalette({
  files,
  query,
  selectedIndex,
  isVisible,
}: CommandPaletteProps) {
  if (!isVisible) {
    return null;
  }

  const filteredFiles = useMemo(
    () => filterFileEntries(files, query),
    [files, query],
  );

  return (
    <Box
      flexDirection="column"
      position="absolute"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      width={60}
    >
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          Command Palette / File Search
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">Query: </Text>
        <Text color="white">{query || "Search files..."}</Text>
      </Box>
      <Box flexDirection="column">
        {filteredFiles.map((file, index) => (
          <Box key={index} paddingLeft={1}>
            <Text
              color={
                index === selectedIndex
                  ? "black"
                  : file.isDirectory
                    ? "blue"
                    : "white"
              }
              backgroundColor={index === selectedIndex ? "magenta" : undefined}
            >
              {file.isDirectory ? "📁" : "📄"} {file.path}
            </Text>
          </Box>
        ))}
      </Box>
      {filteredFiles.length === 0 && <Text color="gray">No files found.</Text>}
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
