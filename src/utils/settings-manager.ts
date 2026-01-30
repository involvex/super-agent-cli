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
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "o1-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp-02-05", // hypothetical future/current
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
  openrouter: [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mistral-large",
    "google/gemini-flash-1.5",
  ],
  minimax: ["abab6.5s-chat"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  ollama: ["llama3", "mistral", "codellama"], // local, dynamic but hardcoded start
  "workers-ai": ["@cf/meta/llama-3.1-70b-instruct"],
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
  };
  mcpServers?: Record<string, any>;
  plugins?: string[]; // Array of plugin paths
  tools?: {
    allowed_tools: string[];
    tools: Array<{ name: string; enabled: boolean }>;
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
  },
  ui: {
    theme: "dark",
    showModelInfoInChat: true,
  },
  settingsVersion: SETTINGS_VERSION,
};

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {};

export class SettingsManager {
  private static instance: SettingsManager;
  private userSettingsPath: string;
  private projectSettingsPath: string;

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

  private getEffectiveSettings(): UserSettings {
    const user = this.loadUserSettings();
    const project = this.loadProjectSettings();
    // Deep merge could be better, but for now simple spread (project overrides user)
    return { ...user, ...project };
  }

  public getActiveProviderConfig(): ProviderConfig | undefined {
    const settings = this.getEffectiveSettings();
    const active = settings.active_provider;
    return settings.providers?.[active];
  }

  public getCurrentModel(): string {
    const config = this.getActiveProviderConfig();
    return config?.model || config?.default_model || "grok-code-fast-1";
  }

  public setCurrentModel(model: string): void {
    const settings = this.loadUserSettings();
    const active = settings.active_provider;
    if (settings.providers && settings.providers[active]) {
      settings.providers[active].model = model;
      this.saveUserSettings(settings);
    }
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
}

export function getSettingsManager(): SettingsManager {
  return SettingsManager.getInstance();
}
