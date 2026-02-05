import { OpenAICompatibleProvider } from "./openai-compatible";

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.groq.com/openai/v1",
      model || "llama-3.3-70b-versatile",
      "groq",
    );
  }
}
