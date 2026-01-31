import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import { OpenAICompatibleProvider } from "./openai-compatible";

export class CohereProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.cohere.ai/v1",
      model || "command-r-plus-08-2024",
      "cohere",
    );
  }

  async listModels(): Promise<string[]> {
    // Cohere specific models
    return [
      "command-r-plus-08-2024",
      "command-r-plus-04-2024",
      "command-r-08-2024",
      "command-r-plus-7b",
      "command-r",
      "command-r7b-12-2024",
      "command-r7b-04-2024",
      "command-r7b-03-2024",
      "command-r7b",
      "command",
      "command-light",
      "command-night",
      "c4ai-aya-expanse-8b",
      "c4ai-aya-13b",
    ];
  }
}
