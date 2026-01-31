import type {
  LLMProvider,
  LLMMessage,
  LLMToolCall,
  LLMResponse,
} from "../../core/llm-provider";

export class MockLLMProvider implements LLMProvider {
  public name: string = "mock-provider";
  private _model: string = "mock-model";
  private originalModel: string = "mock-model";
  private originalName: string = "mock-provider";
  private responses: LLMResponse[] = [];
  private shouldFail: boolean = false;
  private failMessage: string = "Mock error";
  private streamingResponses: any[] = [];
  private streamingResponsesSet: boolean = false;

  constructor(name: string = "mock-provider", model: string = "mock-model") {
    this.name = name;
    this._model = model;
    this.originalModel = model;
    this.originalName = name;
  }

  setModel(model: string): void {
    this._model = model;
  }

  getCurrentModel(): string {
    return this._model;
  }

  async chat(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    if (this.responses.length > 0) {
      return this.responses.shift()!;
    }

    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: "Mock response",
            tool_calls: [],
          },
          finish_reason: "stop",
        },
      ],
    };
  }

  async *chatStream(
    messages: LLMMessage[],
    options?: any,
  ): AsyncGenerator<any, void, unknown> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    // Only use custom streaming responses if explicitly set (even if empty)
    if (this.streamingResponsesSet) {
      for (const chunk of this.streamingResponses) {
        yield chunk;
      }
      return;
    }

    yield {
      choices: [
        {
          delta: { content: "Mock " },
        },
      ],
    };
    yield {
      choices: [
        {
          delta: { content: "streaming " },
        },
      ],
    };
    yield {
      choices: [
        {
          delta: { content: "response" },
        },
      ],
    };
  }

  async listModels(): Promise<string[]> {
    return ["mock-model-1", "mock-model-2", "mock-model-3"];
  }

  setNextResponse(response: LLMResponse): void {
    this.responses.push(response);
  }

  setNextStreamingResponses(chunks: any[]): void {
    this.streamingResponses = chunks;
    this.streamingResponsesSet = true;
  }

  setShouldFail(shouldFail: boolean, message: string = "Mock error"): void {
    this.shouldFail = shouldFail;
    this.failMessage = message;
  }

  reset(): void {
    this.responses = [];
    this.streamingResponses = [];
    this.streamingResponsesSet = false;
    this.shouldFail = false;
    this._model = this.originalModel;
    this.name = this.originalName;
  }
}

export function createMockLLMProvider(
  name: string = "mock-provider",
  model: string = "mock-model",
): MockLLMProvider {
  return new MockLLMProvider(name, model);
}
