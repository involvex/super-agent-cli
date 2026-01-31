import type {
  LLMMessage,
  LLMToolCall,
  LLMResponse,
} from "../../core/llm-provider";
import type { ChatEntry } from "../../agent/super-agent";
import type { ToolResult } from "../../types";
import type { AgentState } from "../../types";

export function createMockChatEntry(
  overrides: Partial<ChatEntry> = {},
): ChatEntry {
  return {
    type: "user",
    content: "Test message",
    timestamp: new Date(),
    ...overrides,
  };
}

export function createMockToolResult(
  overrides: Partial<ToolResult> = {},
): ToolResult {
  return {
    success: true,
    output: "Operation completed successfully",
    ...overrides,
  };
}

export function createMockLLMMessage(
  overrides: Partial<LLMMessage> = {},
): LLMMessage {
  return {
    role: "user",
    content: "Test message",
    ...overrides,
  };
}

export function createMockLLMToolCall(
  overrides: Partial<LLMToolCall> = {},
): LLMToolCall {
  return {
    id: "call_test123",
    type: "function",
    function: {
      name: "view_file",
      arguments: JSON.stringify({ path: "/test/path" }),
    },
    ...overrides,
  };
}

export function createMockLLMResponse(
  overrides: Partial<LLMResponse> = {},
): LLMResponse {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: "Test response",
          tool_calls: [],
        },
        finish_reason: "stop",
      },
    ],
    ...overrides,
  };
}

export function createMockAgentState(
  overrides: Partial<AgentState> = {},
): AgentState {
  return {
    currentDirectory: process.cwd(),
    editHistory: [],
    tools: [],
    ...overrides,
  };
}

export function createMockToolCallArray(count: number = 1): LLMToolCall[] {
  return Array.from({ length: count }, (_, i) =>
    createMockLLMToolCall({
      id: `call_test${i}`,
      function: {
        name: "view_file",
        arguments: JSON.stringify({ path: `/test/path${i}` }),
      },
    }),
  );
}
