import { OpenAICompatibleProvider } from "./openai-compatible";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://openrouter.ai/api/v1",
      model || "anthropic/claude-3.5-sonnet",
      "openrouter",
    );
  }
}
