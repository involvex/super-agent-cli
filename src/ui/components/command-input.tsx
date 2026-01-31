import { Box, Text } from "ink";

interface CommandInputProps {
  input: string;
  isProcessing: boolean;
}

export function CommandInput({ input, isProcessing }: CommandInputProps) {
  return (
    <Box>
      <Text color="blue">$ </Text>
      <Text>
        {input}
        {!isProcessing && <Text color="white">█</Text>}
      </Text>
      {isProcessing && <Text color="yellow"> (processing...)</Text>}
    </Box>
  );
}
