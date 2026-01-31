import {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
} from "../llm-provider";
import { OpenAICompatibleProvider } from "./openai-compatible";

export class TogetherProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(
      apiKey,
      baseURL || "https://api.together.xyz/v1",
      model || "meta-llama/Llama-3.1-70B-Instruct-Turbo",
      "together",
    );
  }

  async listModels(): Promise<string[]> {
    // Together AI specific models
    return [
      "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
      "meta-llama/Llama-3.1-405B-Instruct-Turbo",
      "meta-llama/Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Llama-3-1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "Qwen/Qwen2.5-72B-Instruct",
      "google/gemma-2-27b-it",
      "deepseek-ai/DeepSeek-V3",
      "01-ai/Yi-1.5-34B-Chat",
    ];
  }
}
