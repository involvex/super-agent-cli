import { useCallback, useEffect } from "react";
import { useInput } from "ink";

type SetStateAction<T> = T | ((prevState: T) => T);
type Dispatch<T> = (value: T) => void;

export function useKeyboardInput(
  input: string,
  setInput: Dispatch<SetStateAction<string>>,
  onSubmit: (command: string) => Promise<void>,
  isProcessing: boolean,
  confirmationOptions: unknown,
) {
  useInput(
    useCallback(
      (inputChar: string, key: any) => {
        // If confirmation dialog is open, don't handle normal input
        if (confirmationOptions) {
          return;
        }

        if (key.ctrl && inputChar === "c") {
          process.exit(0);
        }

        if (key.return) {
          if (input.trim() === "exit" || input.trim() === "quit") {
            process.exit(0);
          }

          if (input.trim() && !isProcessing) {
            onSubmit(input.trim());
            setInput("");
          }
          return;
        }

        if (key.backspace || key.delete) {
          setInput((prev: string) => prev.slice(0, -1));
          return;
        }

        if (inputChar && !key.ctrl && !key.meta) {
          setInput((prev: string) => prev + inputChar);
        }
      },
      [input, isProcessing, onSubmit, confirmationOptions],
    ),
  );
}
