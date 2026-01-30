export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: LLMToolCall[];
    };
    finish_reason: string;
  }>;
}

export interface LLMRequestOptions {
  model?: string;
  tools?: LLMTool[];
  search_parameters?: {
    mode?: "auto" | "on" | "off";
  };
}

export interface LLMProvider {
  name: string;

  /**
   * Set the current model
   */
  setModel(model: string): void;

  /**
   * Get the current model
   */
  getCurrentModel(): string;

  /**
   * Send a chat completion request
   */
  chat(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse>;

  /**
   * Stream a chat completion response
   */
  chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<any, void, unknown>;

  /**
   * List available models from the provider
   */
  listModels(): Promise<string[]>;
}
