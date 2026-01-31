/**
 * Image generation tool for Super Agent
 * Integrates with the ImageGenerationService to generate images via AI providers
 */

import {
  getImageGenerationService,
  ImageGenerationOptions,
} from "../image-generation";
import { ToolResult } from "../types/index";

export class ImageGenerationTool {
  private service = getImageGenerationService();

  /**
   * Generate an image from a prompt
   *
   * @param prompt - The text prompt describing the image to generate
   * @param options - Optional parameters (size, format, output directory, provider, model)
   * @returns ToolResult with generated image paths or error
   */
  async generateImage(
    prompt: string,
    options: Partial<ImageGenerationOptions> = {},
  ): Promise<ToolResult> {
    try {
      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: "Prompt is required for image generation",
        };
      }

      const service = getImageGenerationService();

      // Parse prompt for embedded size/format
      const parsed = service.parsePrompt(prompt);

      // Build options
      const generateOptions: ImageGenerationOptions = {
        prompt: parsed.cleanPrompt,
        size: options.size || parsed.size,
        format: options.format || parsed.format,
        n: options.n || 1,
        outputDir: options.outputDir,
        provider: options.provider,
        model: options.model,
      };

      // Generate images
      const result = await service.generateImages(generateOptions);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Format output
      let output = `Generated ${result.images.length} image(s):\n`;

      for (let i = 0; i < result.images.length; i++) {
        const img = result.images[i];
        output += `  ${i + 1}. ${img.path}\n`;

        if (img.revised_prompt) {
          output += `     Revised prompt: ${img.revised_prompt}\n`;
        }
      }

      output += `\nImages saved to: ${service.getOutputDirectory()}`;

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  /**
   * Get the current output directory for generated images
   */
  getOutputDirectory(): string {
    return this.service.getOutputDirectory();
  }

  /**
   * Set the output directory for generated images
   */
  setOutputDirectory(dir: string): void {
    this.service.setOutputDirectory(dir);
  }

  /**
   * Parse a prompt to extract size and format information
   *
   * Examples:
   * - "a cat 1024x1024 as png" -> { cleanPrompt: "a cat", size: "1024x1024", format: "png" }
   * - "a cat in the forest" -> { cleanPrompt: "a cat in the forest", size: undefined, format: undefined }
   */
  parsePrompt(prompt: string): {
    cleanPrompt: string;
    size?: string;
    format?: "png" | "jpeg" | "webp";
  } {
    return this.service.parsePrompt(prompt);
  }

  /**
   * Get supported image sizes for a provider
   */
  getSupportedSizes(provider: string = "openai"): string[] {
    const sizes: Record<string, string[]> = {
      openai: ["1024x1024", "1792x1024", "1024x1792"],
      gemini: ["1024x1024", "1792x1024", "1024x1792", "512x512"],
      openrouter: ["1024x1024", "512x512"],
    };
    return sizes[provider] || sizes.openai;
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats(): ("png" | "jpeg" | "webp")[] {
    return ["png", "jpeg", "webp"];
  }
}
