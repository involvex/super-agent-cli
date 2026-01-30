import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import OpenAI from "openai";

export class GeminiProvider implements LLMProvider {
  public name = "gemini";
  private client: OpenAI;
  private currentModel: string;
  private defaultMaxTokens: number;

  constructor(apiKey: string, baseURL?: string, headerModel?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL:
        baseURL || "https://generativelanguage.googleapis.com/v1beta/openai",
      timeout: 360000,
    });
    this.currentModel = headerModel || "gemini-3-pro-preview";

    // Gemini supports large context windows, so we can be generous with default max tokens if not set
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

      // Gemini OpenAI compat layer might not support search_parameters yet, or treats them differently.
      // For now, we omit them to be safe, similar to standard OpenAI.

      const response = await this.client.chat.completions.create(payload);
      return response as unknown as LLMResponse;
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
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

      const stream = (await this.client.chat.completions.create(
        payload,
      )) as any;

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}
