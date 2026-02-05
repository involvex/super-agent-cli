import { OpenAICompatibleProvider } from "./openai-compatible";

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.deepseek.com/v1",
      model || "deepseek-coder",
      "deepseek",
    );
  }
}
