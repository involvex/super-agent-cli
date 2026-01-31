/**
 * Image generation service for Super Agent CLI
 */

import {
  createImageProvider,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "./providers";
import { getSettingsManager } from "../utils/settings-manager";
import * as path from "path";
import fs from "fs-extra";
import * as os from "os";

export interface ImageGenerationOptions {
  prompt: string;
  size?: string;
  format?: "png" | "jpeg" | "webp";
  n?: number;
  outputDir?: string;
  provider?: string;
  model?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  images: Array<{
    path: string;
    url?: string;
    revised_prompt?: string;
  }>;
  error?: string;
}

export class ImageGenerationService {
  private static instance: ImageGenerationService;
  private outputDir: string;

  private constructor() {
    const settings = getSettingsManager().getEffectiveSettings();
    this.outputDir =
      settings.image_generation?.output_dir || "./generated-images";
  }

  public static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService();
    }
    return ImageGenerationService.instance;
  }

  /**
   * Generate images from a prompt
   */
  async generateImages(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const settings = getSettingsManager().getEffectiveSettings();
    const imageConfig = settings.image_generation;

    if (!imageConfig?.enabled) {
      return {
        success: false,
        images: [],
        error:
          "Image generation is disabled. Enable it with /config set image_generation.enabled true",
      };
    }

    const providerType = options.provider || imageConfig.provider;
    const model = options.model || imageConfig.model;

    // Get API key from providers config
    const providerConfig = settings.providers[providerType];
    if (!providerConfig || !providerConfig.api_key) {
      return {
        success: false,
        images: [],
        error: `No API key configured for provider '${providerType}'. Use /provider set-key ${providerType} <key>`,
      };
    }

    try {
      // Create provider
      const provider = createImageProvider(
        providerType,
        providerConfig.api_key,
        providerConfig.base_url,
        model,
      );

      // Generate request
      const request: ImageGenerationRequest = {
        prompt: options.prompt,
        size: options.size,
        format: options.format || imageConfig.default_format || "png",
        n: options.n || 1,
      };

      // Generate images
      const response = await provider.generateImage(request);

      if (!response.success) {
        return {
          success: false,
          images: [],
          error: response.error,
        };
      }

      // Save images to disk
      const outputDir = options.outputDir || this.outputDir;
      await fs.ensureDir(outputDir);

      const timestamp = Date.now();
      const savedImages: Array<{
        path: string;
        url?: string;
        revised_prompt?: string;
      }> = [];

      for (let i = 0; i < response.images.length; i++) {
        const imageData = response.images[i];
        const ext = options.format || imageConfig.default_format || "png";
        const filename = `image_${timestamp}_${i + 1}.${ext}`;
        const filePath = path.join(outputDir, filename);

        if (imageData.base64) {
          await provider.saveImage(imageData.base64, filePath);
          savedImages.push({
            path: filePath,
            url: imageData.url,
            revised_prompt: imageData.revised_prompt,
          });
        } else if (imageData.url) {
          // If URL provided, download and save
          const axios = (await import("axios")).default;
          const imageResponse = await axios.get(imageData.url, {
            responseType: "arraybuffer",
          });
          await fs.writeFile(filePath, imageResponse.data);
          savedImages.push({
            path: filePath,
            url: imageData.url,
            revised_prompt: imageData.revised_prompt,
          });
        }
      }

      return {
        success: true,
        images: savedImages,
      };
    } catch (error: any) {
      return {
        success: false,
        images: [],
        error: `Image generation failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse prompt for special syntax (size, format in prompt)
   * Example: "a cat 1024x1024 as png"
   */
  parsePrompt(prompt: string): {
    cleanPrompt: string;
    size?: string;
    format?: "png" | "jpeg" | "webp";
  } {
    let cleanPrompt = prompt;
    let size: string | undefined;
    let format: "png" | "jpeg" | "webp" | undefined;

    // Extract size (e.g., "1024x1024", "512x512")
    const sizeMatch = prompt.match(/(\d{3,4})x(\d{3,4})/);
    if (sizeMatch) {
      size = `${sizeMatch[1]}x${sizeMatch[2]}`;
      cleanPrompt = cleanPrompt.replace(sizeMatch[0], "").trim();
    }

    // Extract format (e.g., "as png", "as jpeg")
    const formatMatch = prompt.match(/as (png|jpeg|webp)/i);
    if (formatMatch) {
      format = formatMatch[1].toLowerCase() as "png" | "jpeg" | "webp";
      cleanPrompt = cleanPrompt.replace(formatMatch[0], "").trim();
    }

    return { cleanPrompt, size, format };
  }

  /**
   * Set output directory for generated images
   */
  setOutputDirectory(dir: string): void {
    this.outputDir = dir;
  }

  /**
   * Get current output directory
   */
  getOutputDirectory(): string {
    return this.outputDir;
  }
}

export function getImageGenerationService(): ImageGenerationService {
  return ImageGenerationService.getInstance();
}
