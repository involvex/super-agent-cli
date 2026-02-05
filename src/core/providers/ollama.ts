import { OpenAICompatibleProvider } from "./openai-compatible";

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey || "ollama",
      baseURL || "http://localhost:11434/v1",
      model || "llama3",
      "ollama",
    );
  }
}
