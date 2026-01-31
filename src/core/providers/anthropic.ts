import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
  stop_reason: string | null;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements LLMProvider {
  public name = "anthropic";
  private apiKey: string;
  private baseURL: string;
  private currentModel: string;
  private defaultMaxTokens: number;

  constructor(apiKey: string, baseURL?: string, headerModel?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || "https://api.anthropic.com";
    this.currentModel = headerModel || "claude-sonnet-4-20250514";

    const envMax = Number(process.env.SUPER_AGENT_MAX_TOKENS);
    this.defaultMaxTokens =
      Number.isFinite(envMax) && envMax > 0 ? envMax : 8192;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  private convertMessages(messages: LLMMessage[]): AnthropicMessage[] {
    return messages
      .filter(m => m.role !== "system" && m.role !== "tool")
      .map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));
  }

  private convertTools(tools: any[]) {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  private convertResponse(response: any): LLMResponse {
    const content = response.content
      .map((block: any) =>
        block.type === "text" ? block.text : JSON.stringify(block),
      )
      .join("");

    const toolCalls = response.tool_use
      ? response.tool_use.map((tu: any) => ({
          id: tu.id,
          type: "function" as const,
          function: {
            name: tu.name,
            arguments: tu.input,
          },
        }))
      : undefined;

    return {
      id: response.id,
      object: "chat.completion",
      created: Date.now(),
      model: response.model,
      choices: [
        {
          message: {
            role: "assistant",
            content,
            tool_calls: toolCalls,
          },
          finish_reason: response.stop_reason,
        },
      ],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    } as LLMResponse;
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === "system");
    const anthropicMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : undefined;

    const payload: any = {
      model: options?.model || this.currentModel,
      messages: anthropicMessages,
      max_tokens: this.defaultMaxTokens,
      system: systemMessage?.content,
      tools: tools,
      stream: false,
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return this.convertResponse(data);
  }

  async *chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<any, void, unknown> {
    const systemMessage = messages.find(m => m.role === "system");
    const anthropicMessages = this.convertMessages(messages);
    const tools = options?.tools ? this.convertTools(options.tools) : undefined;

    const payload: any = {
      model: options?.model || this.currentModel,
      messages: anthropicMessages,
      max_tokens: this.defaultMaxTokens,
      system: systemMessage?.content,
      tools: tools,
      stream: true,
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    // Handle Server-Sent Events stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              yield {
                choices: [
                  {
                    delta: {
                      content:
                        parsed.type === "content_block_delta"
                          ? parsed.delta?.text || ""
                          : parsed.type === "content_block_start"
                            ? parsed.content_block?.text || ""
                            : "",
                    },
                  },
                ],
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a public list models API
    // Return known Claude models
    return [
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-20250513",
      "claude-opus-4-20250514",
      "claude-opus-4-20250513",
      "claude-3.5-sonnet-20241022",
      "claude-3.5-sonnet-20240620",
      "claude-3.5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }
}
