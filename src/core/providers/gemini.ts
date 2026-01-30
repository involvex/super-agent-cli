import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiProvider implements LLMProvider {
  public name = "gemini";
  private genAI: GoogleGenerativeAI;
  private currentModel: string;
  private defaultMaxTokens: number;

  constructor(apiKey: string, _baseURL?: string, headerModel?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.currentModel = headerModel || "gemini-3-flash-preview";

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

  private convertMessages(messages: LLMMessage[]) {
    // Separate system prompt from history
    const systemInstruction = messages.find(m => m.role === "system")?.content;
    const history = messages
      .filter(m => m.role !== "system")
      .map(m => {
        if (m.role === "user") {
          return { role: "user", parts: [{ text: m.content }] };
        } else if (m.role === "assistant") {
          return {
            role: "model",
            parts: [{ text: m.content || "" }],
            // Handle tool calls if any (Gemini SDK uses different format)
          };
        } else if (m.role === "tool") {
          // Gemini tool results
          return {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: m.name || "",
                  response: { content: m.content },
                },
              },
            ],
          };
        }
        return { role: "user", parts: [{ text: m.content }] };
      });

    return { systemInstruction, history };
  }

  private convertTools(tools: any[]) {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map(t => ({
      functionDeclarations: [
        {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      ],
    }));
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse> {
    try {
      const modelName = options?.model || this.currentModel;
      const { systemInstruction, history } = this.convertMessages(messages);

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction,
        tools: this.convertTools(options?.tools || []) as any,
      });

      // Special thinking config for gemini-3 if requested or detected
      const generationConfig: any = {
        maxOutputTokens: this.defaultMaxTokens,
        temperature: 0.7,
      };

      if (modelName.includes("gemini-3")) {
        generationConfig.thinkingConfig = {
          includeThoughts: true,
        };
      }

      const lastMessage = history.pop();
      const chat = model.startChat({
        history: history as any[],
        generationConfig,
      });

      const result = await chat.sendMessage(lastMessage?.parts || []);
      const response = await result.response;

      // Convert Gemini response to LLMResponse format
      const candidate = response.candidates?.[0];
      const toolCalls = candidate?.content.parts
        .filter(p => p.functionCall)
        .map(p => ({
          id: `call_${Math.random().toString(36).substring(7)}`,
          type: "function" as const,
          function: {
            name: p.functionCall!.name,
            arguments: JSON.stringify(p.functionCall!.args),
          },
        }));

      return {
        id: response.usageMetadata?.promptTokenCount?.toString() || "id",
        object: "chat.completion",
        created: Date.now(),
        model: modelName,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response.text(),
              tool_calls:
                toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
          completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: response.usageMetadata?.totalTokenCount || 0,
        },
      } as any;
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async *chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<any, void, unknown> {
    try {
      const modelName = options?.model || this.currentModel;
      const { systemInstruction, history } = this.convertMessages(messages);

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction,
        tools: this.convertTools(options?.tools || []) as any,
      });

      const generationConfig: any = {
        maxOutputTokens: this.defaultMaxTokens,
        temperature: 0.7,
      };

      if (modelName.includes("gemini-3")) {
        generationConfig.thinkingConfig = {
          includeThoughts: true,
        };
      }

      const lastMessage = history.pop();
      const chat = model.startChat({
        history: history as any[],
        generationConfig,
      });

      const result = await chat.sendMessageStream(lastMessage?.parts || []);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield {
          choices: [
            {
              delta: {
                content: text,
              },
            },
          ],
        };
      }
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
  async listModels(): Promise<string[]> {
    // Gemini SDK doesn't expose a simple list models on the client instance easily
    // without using the model manager, which is distinct.
    // Integrating GoogleGenerativeAI.getGenerativeModel is for a specific model.
    // Return empty to allow fallback to hardcoded list.
    return [];
  }
}
