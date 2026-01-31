import * as path from "path";
import * as os from "os";
import * as fs from "fs";

/**
 * Current settings version
 */
const SETTINGS_VERSION = 2;

// Models mapping per provider
export const PROVIDER_MODELS: Record<string, string[]> = {
  grok: [
    "grok-beta",
    "grok-vision-beta",
    "grok-2-vision-1212",
    "grok-2-1212",
    "grok-code-fast-1",
    "grok-image-preview", // Image generation
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "o1-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "dall-e-3", // Image generation
    "dall-e-2", // Image generation
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp-02-05",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "imagen-3.0-generate-001", // Image generation
    "imagen-3.0-generate-001-fast", // Image generation
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3.5-sonnet-20241022",
    "claude-3-haiku-20241022",
  ],
  mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
  openrouter: [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mistral-large",
    "google/gemini-flash-1.5",
    "openai/dall-e-3", // Image generation via OpenRouter
    "stabilityai/stable-diffusion-xl-base-1.0", // Image generation
  ],
  minimax: ["abab6.5s-chat"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  ollama: ["llama3", "mistral", "codellama"],
  "workers-ai": ["@cf/meta/llama-3.1-70b-instruct"],
  zai: [
    "GLM-4.7",
    "GLM-4.5-Air",
    "GLM-4.5",
    "GLM-4.5-Airx",
    "GLM-4.5-Flash",
    "GLM-4.5-X",
    "GLM-4.5v",
    "GLM-4.6",
  ],
  together: [
    "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
    "meta-llama/Llama-3.1-405B-Instruct-Turbo",
    "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen/Qwen2.5-72B-Instruct",
  ],
  perplexity: [
    "llama-3.1-sonnet-small-128k-online",
    "llama-3.1-sonnet-large-128k-online",
    "llama-3.1-sonnet-huge-128k-online",
    "llama-3.1-8b-online",
    "llama-3.1-70b-online",
    "mixtral-8x7b-online",
  ],
  cohere: [
    "command-r-plus-08-2024",
    "command-r-08-2024",
    "command-r7b-12-2024",
    "command",
    "command-light",
    "c4ai-aya-expanse-8b",
    "c4ai-aya-13b",
  ],
};

export interface ProviderConfig {
  id: string;
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  default_model?: string;
  account_id?: string;
}

export interface UserSettings {
  active_provider: string;
  providers: Record<string, ProviderConfig>;
  ui: {
    theme: string;
    custom_theme_path?: string;
    show_memory_usage?: boolean;
    show_token_usage?: boolean;
    show_context?: boolean;
    showModelInfoInChat?: boolean;
    show_statusbar?: boolean;
    statusbar_config?: {
      show_model?: boolean;
      show_tool_calls?: boolean;
      show_git_status?: boolean;
      show_memory?: boolean;
      show_cpu?: boolean;
      show_tokens?: boolean;
      show_context?: boolean;
    };
  };
  mcpServers?: Record<string, any>;
  plugins?: string[]; // Array of plugin paths
  tools?: {
    allowed_tools: string[];
    tools: Array<{ name: string; enabled: boolean }>;
    enable_todo_tool?: boolean;
    match_precision_on_tool_calls?: boolean;
  };
  model_config?: {
    reasoning_effort?: "low" | "medium" | "high";
    temperature?: number;
  };
  editing?: {
    enable_diffs?: boolean;
  };
  rate_limit?: {
    enabled?: boolean;
    min_time_between_requests?: number; // in milliseconds
    repetition_limit?: number; // max consecutive errors
  };
  conversation?: {
    auto_compact?: boolean;
    compact_threshold?: number; // number of messages before compacting
  };
  hooks?: Record<string, any>;
  auto_edit?: {
    enabled: boolean;
    default_state: string;
  };
  modes?: {
    active_mode: string;
    default_mode: string;
    modes: Array<{
      name: string;
      description: string;
      enabled: boolean;
      prompt: string;
    }>;
  };
  custom_commands?: Record<string, string>;
  env?: Record<string, string>;
  context?: {
    fileName: string[];
  };
  experimental?: {
    checkpointing: {
      enabled: boolean;
      auto_save: boolean;
      auto_load: boolean;
    };
  };
  image_generation?: {
    enabled: boolean;
    provider: string; // "openai" | "gemini" | "openrouter" | "openai-compatible"
    model: string; // e.g., "dall-e-3", "imagen-3.0-generate-001"
    output_dir: string; // Directory to save images (default: "./generated-images")
    default_format?: "png" | "jpeg" | "webp"; // Default image format
  };
  settingsVersion?: number;
}

export interface ProjectSettings extends Partial<UserSettings> {}

const DEFAULT_USER_SETTINGS: UserSettings = {
  active_provider: "grok",
  providers: {
    grok: {
      id: "grok",
      provider: "grok",
      model: "grok-code-fast-1",
      api_key: "",
      base_url: "https://api.x.ai/v1",
      default_model: "grok-code-fast-1",
    },
    openai: {
      id: "openai",
      provider: "openai",
      model: "gpt-4o",
      api_key: "",
      base_url: "https://api.openai.com/v1",
      default_model: "gpt-4o",
    },
    gemini: {
      id: "gemini",
      provider: "gemini",
      model: "gemini-2.0-flash",
      api_key: "",
      base_url: "", // Will use official SDK defaults
      default_model: "gemini-2.0-flash",
    },
    mistral: {
      id: "mistral",
      provider: "mistral",
      model: "mistral-large-latest",
      api_key: "",
      base_url: "https://api.mistral.ai/v1",
      default_model: "mistral-large-latest",
    },
    openrouter: {
      id: "openrouter",
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      api_key: "",
      base_url: "https://openrouter.ai/api/v1",
      default_model: "anthropic/claude-3.5-sonnet",
    },
    minimax: {
      id: "minimax",
      provider: "minimax",
      model: "abab6.5s-chat",
      api_key: "",
      base_url: "https://api.minimax.chat/v1",
      default_model: "abab6.5s-chat",
    },
    groq: {
      id: "groq",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      api_key: "",
      base_url: "https://api.groq.com/openai/v1",
      default_model: "llama-3.3-70b-versatile",
    },
    deepseek: {
      id: "deepseek",
      provider: "deepseek",
      model: "deepseek-coder",
      api_key: "",
      base_url: "https://api.deepseek.com/v1",
      default_model: "deepseek-coder",
    },
    ollama: {
      id: "ollama",
      provider: "ollama",
      model: "llama3",
      api_key: "ollama", // key not needed usually, but some clients require non-empty
      base_url: "http://localhost:11434/v1",
      default_model: "llama3",
    },
    "workers-ai": {
      id: "workers-ai",
      provider: "workers-ai",
      model: "@cf/meta/llama-3.1-70b-instruct",
      api_key: "",
      base_url:
        "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1",
      default_model: "@cf/meta/llama-3.1-70b-instruct",
    },
    zai: {
      id: "zai",
      provider: "zai",
      model: "GLM-4.7",
      api_key: "",
      base_url: "https://api.z.ai/api/coding/paas/v4/",
      default_model: "GLM-4.7",
    },
    anthropic: {
      id: "anthropic",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      api_key: "",
      base_url: "https://api.anthropic.com",
      default_model: "claude-sonnet-4-20250514",
    },
    together: {
      id: "together",
      provider: "together",
      model: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
      api_key: "",
      base_url: "https://api.together.xyz/v1",
      default_model: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    },
    perplexity: {
      id: "perplexity",
      provider: "perplexity",
      model: "llama-3.1-sonnet-small-128k-online",
      api_key: "",
      base_url: "https://api.perplexity.ai",
      default_model: "llama-3.1-sonnet-small-128k-online",
    },
    cohere: {
      id: "cohere",
      provider: "cohere",
      model: "command-r-plus-08-2024",
      api_key: "",
      base_url: "https://api.cohere.ai/v1",
      default_model: "command-r-plus-08-2024",
    },
  },
  ui: {
    theme: "dark",
    showModelInfoInChat: true,
    show_statusbar: false,
    statusbar_config: {
      show_model: true,
      show_tool_calls: true,
      show_git_status: true,
      show_memory: false,
      show_cpu: false,
      show_tokens: true,
      show_context: true,
    },
  },
  tools: {
    allowed_tools: [],
    tools: [],
    enable_todo_tool: false,
    match_precision_on_tool_calls: false,
  },
  model_config: {
    reasoning_effort: "medium",
    temperature: 0.7,
  },
  editing: {
    enable_diffs: false,
  },
  rate_limit: {
    enabled: false,
    min_time_between_requests: 1000,
    repetition_limit: 5,
  },
  conversation: {
    auto_compact: false,
    compact_threshold: 50,
  },
  image_generation: {
    enabled: true,
    provider: "openai",
    model: "dall-e-3",
    output_dir: "./generated-images",
    default_format: "png",
  },
  settingsVersion: SETTINGS_VERSION,
};

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {};

// Model cache file path
const MODELS_CACHE_PATH = path.join(
  os.homedir(),
  ".super-agent",
  "models-cache.json",
);

interface ModelsCacheEntry {
  models: string[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface ModelsCache {
  [providerId: string]: ModelsCacheEntry;
}

export class SettingsManager {
  private static instance: SettingsManager;
  private userSettingsPath: string;
  private projectSettingsPath: string;
  private modelsCachePath: string;
  private inMemoryCache: Map<string, string[]> = new Map();

  private constructor() {
    this.userSettingsPath = path.join(
      os.homedir(),
      ".super-agent",
      "settings.json",
    );
    this.projectSettingsPath = path.join(
      process.cwd(),
      ".super-agent",
      "settings.json",
    );
    this.modelsCachePath = MODELS_CACHE_PATH;
  }

  public getStorageDirectory(): string {
    return path.join(os.homedir(), ".super-agent");
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  public loadUserSettings(): UserSettings {
    try {
      if (!fs.existsSync(this.userSettingsPath)) {
        const newSettings = {
          ...DEFAULT_USER_SETTINGS,
          settingsVersion: SETTINGS_VERSION,
        };
        this.saveUserSettings(newSettings);
        return newSettings;
      }
      const content = fs.readFileSync(this.userSettingsPath, "utf-8");
      const settings = JSON.parse(content);

      // Deep merge providers to ensure defaults are preserved
      const mergedProviders = { ...DEFAULT_USER_SETTINGS.providers };
      if (settings.providers) {
        for (const [key, value] of Object.entries(settings.providers)) {
          mergedProviders[key] = {
            ...(mergedProviders[key] || {}),
            ...(value as any),
          };
        }
      }

      return {
        ...DEFAULT_USER_SETTINGS,
        ...settings,
        providers: mergedProviders,
      };
    } catch (error) {
      console.warn("Failed to load user settings:", error);
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  public saveUserSettings(settings: Partial<UserSettings>): void {
    try {
      this.ensureDirectoryExists(this.userSettingsPath);
      let existingSettings = this.loadUserSettings();
      const mergedSettings = { ...existingSettings, ...settings };
      fs.writeFileSync(
        this.userSettingsPath,
        JSON.stringify(mergedSettings, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      console.error("Failed to save user settings:", error);
      throw error;
    }
  }

  public updateUserSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ): void {
    const settings = { [key]: value } as Partial<UserSettings>;
    if (key === "active_provider" && typeof value === "string") {
      settings.active_provider = value.toLowerCase();
    }
    this.saveUserSettings(settings);
  }

  public getUserSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    return this.loadUserSettings()[key];
  }

  public loadProjectSettings(): ProjectSettings {
    try {
      if (!fs.existsSync(this.projectSettingsPath)) {
        return { ...DEFAULT_PROJECT_SETTINGS };
      }
      const content = fs.readFileSync(this.projectSettingsPath, "utf-8");
      return { ...DEFAULT_PROJECT_SETTINGS, ...JSON.parse(content) };
    } catch (error) {
      console.warn("Failed to load project settings:", error);
      return { ...DEFAULT_PROJECT_SETTINGS };
    }
  }

  public saveProjectSettings(settings: ProjectSettings): void {
    try {
      this.ensureDirectoryExists(this.projectSettingsPath);
      let existing = this.loadProjectSettings();
      const merged = { ...existing, ...settings };
      fs.writeFileSync(
        this.projectSettingsPath,
        JSON.stringify(merged, null, 2),
      );
    } catch (error) {
      console.error("Failed to save project settings:", error);
      throw error;
    }
  }

  public updateProjectSetting<K extends keyof ProjectSettings>(
    key: K,
    value: ProjectSettings[K],
  ): void {
    const settings = { [key]: value } as ProjectSettings;
    this.saveProjectSettings(settings);
  }

  public getProjectSetting<K extends keyof ProjectSettings>(
    key: K,
  ): ProjectSettings[K] {
    return this.loadProjectSettings()[key];
  }

  // --- Helper Methods using Active Provider ---

  public getEffectiveSettings(): UserSettings {
    const user = this.loadUserSettings();
    const project = this.loadProjectSettings();

    // Deep merge providers to ensure all provider configs are available
    const mergedProviders = { ...user.providers };
    if (project.providers) {
      for (const [key, value] of Object.entries(project.providers)) {
        mergedProviders[key] = {
          ...(mergedProviders[key] || {}),
          ...(value as any),
        };
      }
    }

    return {
      ...user,
      ...project,
      providers: mergedProviders,
    };
  }

  public getActiveProviderConfig(): ProviderConfig | undefined {
    const settings = this.getEffectiveSettings();
    const active = (settings.active_provider || "grok").toLowerCase();
    return settings.providers?.[active];
  }

  public getCurrentModel(): string {
    const config = this.getActiveProviderConfig();
    return config?.model || config?.default_model || "grok-code-fast-1";
  }

  public setCurrentModel(model: string): void {
    // Update user settings
    const userSettings = this.loadUserSettings();
    const active = (userSettings.active_provider || "grok").toLowerCase();
    if (userSettings.providers && userSettings.providers[active]) {
      userSettings.providers[active].model = model;
      this.saveUserSettings(userSettings);
    }

    // Also update project settings to ensure persistence across restarts
    // Project settings override user settings, so we need to update both
    const projectSettings = this.loadProjectSettings();
    if (projectSettings.providers && projectSettings.providers[active]) {
      projectSettings.providers[active].model = model;
      this.saveProjectSettings(projectSettings);
    } else if (projectSettings.providers) {
      // If provider doesn't exist in project settings, add it
      projectSettings.providers[active] = {
        ...userSettings.providers[active],
        model,
      };
      this.saveProjectSettings(projectSettings);
    } else {
      // Create providers object in project settings
      this.saveProjectSettings({
        providers: {
          [active]: {
            ...userSettings.providers[active],
            model,
          },
        },
      });
    }
  }

  public setActiveProvider(providerId: string): void {
    // Update user settings
    const userSettings = this.loadUserSettings();
    userSettings.active_provider = providerId.toLowerCase();
    this.saveUserSettings(userSettings);

    // Also update project settings to ensure persistence across restarts
    const projectSettings = this.loadProjectSettings();
    projectSettings.active_provider = providerId.toLowerCase();
    this.saveProjectSettings(projectSettings);
  }

  public getAvailableModels(providerId?: string): string[] {
    const activeProvider =
      providerId || this.getActiveProviderConfig()?.id || "grok";

    // Check if we have specific models for this provider
    let models = PROVIDER_MODELS[activeProvider];

    if (!models) {
      // Try looking up by provider type if ID didn't match
      const config = this.getEffectiveSettings().providers[activeProvider];
      if (config && PROVIDER_MODELS[config.provider]) {
        models = PROVIDER_MODELS[config.provider];
      }
    }

    if (models) {
      return models;
    }

    // If provider is active but not in PROVIDER_MODELS (e.g. custom/new provider like 'zai')
    // Return the currently configured model so it appears in the list
    if (activeProvider) {
      const config = this.getEffectiveSettings().providers[activeProvider];
      if (config && config.model) {
        return [config.model];
      }
    }

    // Fallback default list if provider unknown
    return [
      "grok-beta",
      "grok-vision-beta",
      "grok-2-vision-1212",
      "grok-2-1212",
      "grok-code-fast-1",
    ];
  }

  public getApiKey(): string | undefined {
    if (process.env.SUPER_AGENT_API_KEY) {
      return process.env.SUPER_AGENT_API_KEY;
    }
    const config = this.getActiveProviderConfig();
    return config?.api_key;
  }

  public getBaseURL(): string | undefined {
    if (process.env.SUPER_AGENT_BASE_URL) {
      return process.env.SUPER_AGENT_BASE_URL;
    }
    const config = this.getActiveProviderConfig();
    return config?.base_url || undefined;
  }

  // --- Dynamic Model Fetching ---

  private loadModelsCache(): ModelsCache {
    try {
      if (fs.existsSync(this.modelsCachePath)) {
        const content = fs.readFileSync(this.modelsCachePath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return {};
  }

  private saveModelsCache(cache: ModelsCache): void {
    try {
      this.ensureDirectoryExists(this.modelsCachePath);
      fs.writeFileSync(this.modelsCachePath, JSON.stringify(cache, null, 2));
    } catch (error) {
      // Ignore cache save errors
    }
  }

  /**
   * Fetch models for a provider from the API
   * @param providerId The provider ID
   * @param forceRefresh If true, bypass cache and fetch from API
   * @param providerClient Optional pre-configured provider client to use for fetching
   * @returns Promise<string[]> List of model IDs
   */
  public async fetchModelsForProvider(
    providerId: string,
    forceRefresh: boolean = false,
    providerClient?: { listModels(): Promise<string[]> },
  ): Promise<string[]> {
    const normalizedProviderId = providerId.toLowerCase();

    // Check in-memory cache first
    if (!forceRefresh && this.inMemoryCache.has(normalizedProviderId)) {
      return this.inMemoryCache.get(normalizedProviderId)!;
    }

    // Check disk cache
    if (!forceRefresh) {
      const cache = this.loadModelsCache();
      const entry = cache[normalizedProviderId];
      const now = Date.now();
      if (entry && now - entry.timestamp < entry.ttl) {
        // Cache is still valid
        this.inMemoryCache.set(normalizedProviderId, entry.models);
        return entry.models;
      }
    }

    // Fetch from API using the provided client or create a temporary one
    let models: string[] = [];

    if (providerClient) {
      try {
        models = await providerClient.listModels();
      } catch (error) {
        // Silently fall back to hardcoded list
      }
    } else {
      // If no client provided, we'll use the hardcoded list as fallback
      // The actual fetching should be done at the agent level where we have provider instances
    }

    // If API fetch failed or returned empty, use hardcoded list
    if (models.length === 0) {
      models = this.getAvailableModels(providerId);
    }

    // Update caches
    this.inMemoryCache.set(normalizedProviderId, models);

    const cache = this.loadModelsCache();
    cache[normalizedProviderId] = {
      models,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    };
    this.saveModelsCache(cache);

    return models;
  }

  /**
   * Clear the model cache for a specific provider or all providers
   */
  public clearModelsCache(providerId?: string): void {
    if (providerId) {
      this.inMemoryCache.delete(providerId.toLowerCase());
      const cache = this.loadModelsCache();
      delete cache[providerId.toLowerCase()];
      this.saveModelsCache(cache);
    } else {
      this.inMemoryCache.clear();
      if (fs.existsSync(this.modelsCachePath)) {
        fs.unlinkSync(this.modelsCachePath);
      }
    }
  }
}

export function getSettingsManager(): SettingsManager {
  return SettingsManager.getInstance();
}
