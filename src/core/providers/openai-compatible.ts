import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import OpenAI from "openai";

export class OpenAICompatibleProvider implements LLMProvider {
  public name: string;
  private client: OpenAI;
  private currentModel: string;
  private defaultMaxTokens: number;

  constructor(
    apiKey: string,
    baseURL: string,
    model: string,
    name: string = "openai-compatible",
  ) {
    this.name = name;
    this.client = new OpenAI({
      apiKey: apiKey || "dummy-key", // Some providers don't need a key or user might trigger this without one set yet
      baseURL,
      timeout: 360000,
    });
    this.currentModel = model;

    const envMax = Number(process.env.SUPER_AGENT_MAX_TOKENS);
    this.defaultMaxTokens =
      Number.isFinite(envMax) && envMax > 0 ? envMax : 4096;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse> {
    try {
      const model = options?.model || this.currentModel;
      const tools = options?.tools || [];

      // Determine proper tool structure
      // Most compatible providers want 'tools' and 'tool_choice' just like OpenAI
      const payload: any = {
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        max_tokens: this.defaultMaxTokens,
      };

      if (options?.search_parameters) {
        // Pass through search parameters for providers that might support extensions (like Grok on compatible endpoint)
        payload.search_parameters = options.search_parameters;
      }

      const response = await this.client.chat.completions.create(payload);
      return response as unknown as LLMResponse;
    } catch (error: any) {
      throw new Error(`${this.name} API error: ${error.message}`);
    }
  }

  async *chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<any, void, unknown> {
    try {
      const model = options?.model || this.currentModel;
      const tools = options?.tools || [];

      const payload: any = {
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        max_tokens: this.defaultMaxTokens,
        stream: true,
      };

      if (options?.search_parameters) {
        payload.search_parameters = options.search_parameters;
      }

      const stream = (await this.client.chat.completions.create(
        payload,
      )) as any;

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      throw new Error(`${this.name} API error: ${error.message}`);
    }
  }
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(m => m.id);
    } catch (error) {
      // Fallback or silent fail
      return [];
    }
  }
}
