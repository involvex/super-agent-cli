import * as path from "path";
import * as os from "os";
import * as fs from "fs";

/**
 * Current settings version
 */
const SETTINGS_VERSION = 2;

export interface ProviderConfig {
  id: string;
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  default_model?: string;
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
  plugins?: {
    allowed_plugins: string[];
    plugins: Array<{ name: string }>;
  };
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
  active_provider: "zai",
  providers: {
    zai: {
      id: "zai",
      provider: "zai",
      model: "glm-4.7",
      api_key: "",
      base_url: "https://api.z.ai/api/paas/v4",
      default_model: "glm-4.7",
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
      model: "gemini-3-flash-preview",
      api_key: "",
      base_url: "", // Will use official SDK defaults
      default_model: "gemini-3-flash-preview",
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
      return { ...DEFAULT_USER_SETTINGS, ...settings };
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

  public getAvailableModels(): string[] {
    // Return a default list of known supported models
    return [
      "grok-beta",
      "grok-vision-beta",
      "grok-2-vision-1212",
      "grok-2-1212",
      "grok-code-fast-1",
      "gpt-4o",
      "gpt-4o-mini",
      "o1-preview",
      "o1-mini",
      "gemini-3-pro-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "GLM-4.7",
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
