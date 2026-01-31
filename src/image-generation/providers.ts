/**
 * Image generation provider interfaces and implementations
 */

export interface ImageGenerationRequest {
  prompt: string;
  size?: string; // e.g., "1024x1024", "512x512"
  format?: "png" | "jpeg" | "webp";
  n?: number; // Number of images to generate (default: 1)
}

export interface ImageGenerationResponse {
  success: boolean;
  images: Array<{
    url?: string; // URL to the image
    base64?: string; // Base64 encoded image data
    revised_prompt?: string; // For DALL-E 3, the revised prompt
  }>;
  error?: string;
}

/**
 * Base interface for image generation providers
 */
export interface ImageGenerationProvider {
  name: string;
  generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse>;
  saveImage(imageData: string, outputPath: string): Promise<string>;
}

/**
 * OpenAI DALL-E image generation provider
 */
export class OpenAIImageProvider implements ImageGenerationProvider {
  name = "OpenAI (DALL-E)";

  constructor(
    private apiKey: string,
    private baseURL?: string,
  ) {}

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      const baseUrl = this.baseURL || "https://api.openai.com/v1";
      const size = request.size || "1024x1024";

      const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: request.prompt,
          n: request.n || 1,
          size: this.validateSize(size),
          response_format: "b64_json", // Get base64 for easier saving
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          images: [],
          error: `OpenAI API error: ${error}`,
        };
      }

      const data = (await response.json()) as any;

      const images = data.data.map((item: any) => ({
        base64: item.b64_json,
        revised_prompt: item.revised_prompt,
      }));

      return { success: true, images };
    } catch (error: any) {
      return {
        success: false,
        images: [],
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  async saveImage(imageData: string, outputPath: string): Promise<string> {
    const fs = await import("fs-extra");
    const buffer = Buffer.from(imageData, "base64");
    await fs.ensureFile(outputPath);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  private validateSize(size: string): string {
    const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
    if (validSizes.includes(size)) {
      return size;
    }
    return "1024x1024"; // Default
  }
}

/**
 * Gemini Imagen image generation provider
 */
export class GeminiImageProvider implements ImageGenerationProvider {
  name = "Google Gemini (Imagen)";

  constructor(private apiKey: string) {}

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      // Using Imagen 3 API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predictImage?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: request.prompt,
            number_of_images: request.n || 1,
            aspect_ratio: this.sizeToAspectRatio(request.size),
            safety_filter_level: "block_some",
            person_generation: "allow_adult",
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          images: [],
          error: `Gemini API error: ${error}`,
        };
      }

      const data = (await response.json()) as any;

      const images =
        data.generatedImages?.map((item: any) => ({
          base64: item.bytesBase64Encoded,
        })) || [];

      return { success: true, images };
    } catch (error: any) {
      return {
        success: false,
        images: [],
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  async saveImage(imageData: string, outputPath: string): Promise<string> {
    const fs = await import("fs-extra");
    const buffer = Buffer.from(imageData, "base64");
    await fs.ensureFile(outputPath);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  private sizeToAspectRatio(size?: string): string {
    // Map size strings to Imagen aspect ratios
    const sizeMap: Record<string, string> = {
      "1024x1024": "1:1",
      "1792x1024": "16:9",
      "1024x1792": "9:16",
      "512x512": "1:1",
    };
    return sizeMap[size || "1024x1024"] || "1:1";
  }
}

/**
 * OpenRouter image generation provider
 */
export class OpenRouterImageProvider implements ImageGenerationProvider {
  name = "OpenRouter";

  constructor(private apiKey: string) {}

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://github.com/involvex/super-agent-cli",
          },
          body: JSON.stringify({
            model: "openai/dall-e-3", // Default to DALL-E via OpenRouter
            messages: [
              {
                role: "user",
                content: request.prompt,
              },
            ],
            max_tokens: 1000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          images: [],
          error: `OpenRouter API error: ${error}`,
        };
      }

      // Note: OpenRouter primarily handles text LLMs
      // Image generation may need to be routed differently
      // This is a placeholder for when OpenRouter adds native image support
      return {
        success: false,
        images: [],
        error:
          "OpenRouter image generation not yet supported. Please use OpenAI directly or another provider.",
      };
    } catch (error: any) {
      return {
        success: false,
        images: [],
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  async saveImage(imageData: string, outputPath: string): Promise<string> {
    const fs = await import("fs-extra");
    const buffer = Buffer.from(imageData, "base64");
    await fs.ensureFile(outputPath);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
}

/**
 * Generic OpenAI-compatible image generation provider
 */
export class OpenAICompatibleImageProvider implements ImageGenerationProvider {
  name = "OpenAI-compatible";

  constructor(
    private apiKey: string,
    private baseURL: string,
    private modelName: string = "dall-e-3",
  ) {}

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      const size = request.size || "1024x1024";

      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: request.prompt,
          n: request.n || 1,
          size: size,
          response_format: "b64_json",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          images: [],
          error: `API error: ${error}`,
        };
      }

      const data = (await response.json()) as any;

      const images =
        data.data?.map((item: any) => ({
          base64: item.b64_json,
          revised_prompt: item.revised_prompt,
        })) || [];

      return { success: true, images };
    } catch (error: any) {
      return {
        success: false,
        images: [],
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  async saveImage(imageData: string, outputPath: string): Promise<string> {
    const fs = await import("fs-extra");
    const buffer = Buffer.from(imageData, "base64");
    await fs.ensureFile(outputPath);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
}

/**
 * Factory function to create image generation provider
 */
export function createImageProvider(
  providerType: string,
  apiKey: string,
  baseURL?: string,
  modelName?: string,
): ImageGenerationProvider {
  switch (providerType.toLowerCase()) {
    case "openai":
      return new OpenAIImageProvider(apiKey, baseURL);
    case "gemini":
      return new GeminiImageProvider(apiKey);
    case "openrouter":
      return new OpenRouterImageProvider(apiKey);
    case "openai-compatible":
      if (!baseURL) {
        throw new Error("baseURL is required for openai-compatible provider");
      }
      return new OpenAICompatibleImageProvider(apiKey, baseURL, modelName);
    default:
      throw new Error(`Unsupported image generation provider: ${providerType}`);
  }
}
