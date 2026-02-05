import { OpenAICompatibleProvider } from "./openai-compatible";

export class MistralProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.mistral.ai/v1",
      model || "mistral-large-latest",
      "mistral",
    );
  }
}
