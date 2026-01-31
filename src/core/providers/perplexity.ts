import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import { OpenAICompatibleProvider } from "./openai-compatible";

export class PerplexityProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.perplexity.ai",
      model || "llama-3.1-sonnet-small-128k-online",
      "perplexity",
    );
  }

  async listModels(): Promise<string[]> {
    // Perplexity AI specific models (sonnet and sonnet-chat are the current models)
    return [
      "llama-3.1-sonnet-small-128k-online",
      "llama-3.1-sonnet-large-128k-online",
      "llama-3.1-sonnet-huge-128k-online",
      "llama-3.1-8b-online",
      "llama-3.1-70b-online",
      "mixtral-8x7b-online",
    ];
  }
}
