import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import OpenAI from "openai";

export class GrokProvider implements LLMProvider {
  public name = "grok";
  private client: OpenAI;
  private currentModel: string;
  private defaultMaxTokens: number;

  constructor(apiKey: string, baseURL?: string, headerModel?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || "https://api.x.ai/v1",
      timeout: 360000,
    });
    this.currentModel = headerModel || "grok-code-fast-1";

    const envMax = Number(process.env.SUPER_AGENT_MAX_TOKENS);
    this.defaultMaxTokens =
      Number.isFinite(envMax) && envMax > 0 ? envMax : 1536;
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

      const payload: any = {
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        max_tokens: this.defaultMaxTokens,
      };

      if (options?.search_parameters) {
        payload.search_parameters = options.search_parameters;
      }

      const response = await this.client.chat.completions.create(payload);
      return response as unknown as LLMResponse;
    } catch (error: any) {
      throw new Error(`Grok API error: ${error.message}`);
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
      throw new Error(`Grok API error: ${error.message}`);
    }
  }
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(m => m.id);
    } catch (error) {
      return [];
    }
  }
}
