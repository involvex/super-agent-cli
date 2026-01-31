import type {
  SettingsManager,
  UserSettings,
  ProviderConfig,
} from "../../utils/settings-manager";

export class MockSettingsManager {
  private userSettings: UserSettings;
  private projectSettings: Partial<UserSettings> = {};
  private shouldFail: boolean = false;

  constructor() {
    this.userSettings = this.getDefaultSettings();
  }

  private getDefaultSettings(): UserSettings {
    return {
      active_provider: "grok",
      providers: {
        grok: {
          id: "grok",
          provider: "grok",
          model: "grok-code-fast-1",
          api_key: "test-api-key",
          base_url: "https://api.mock.com/v1",
          default_model: "grok-code-fast-1",
        },
      },
      ui: {
        theme: "dark",
        showModelInfoInChat: true,
      },
      settingsVersion: 2,
    };
  }

  loadUserSettings(): UserSettings {
    if (this.shouldFail) {
      throw new Error("Failed to load user settings");
    }
    return { ...this.userSettings };
  }

  saveUserSettings(settings: Partial<UserSettings>): void {
    if (this.shouldFail) {
      throw new Error("Failed to save user settings");
    }
    this.userSettings = { ...this.userSettings, ...settings };
  }

  loadProjectSettings(): Partial<UserSettings> {
    if (this.shouldFail) {
      throw new Error("Failed to load project settings");
    }
    return { ...this.projectSettings };
  }

  saveProjectSettings(settings: Partial<UserSettings>): void {
    if (this.shouldFail) {
      throw new Error("Failed to save project settings");
    }
    this.projectSettings = { ...this.projectSettings, ...settings };
  }

  updateUserSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ): void {
    this.userSettings[key] = value;
  }

  getUserSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    return this.userSettings[key];
  }

  getEffectiveSettings(): UserSettings {
    const user = this.userSettings;
    const project = this.projectSettings;
    const mergedProviders = { ...user.providers, ...project.providers };
    return {
      ...user,
      ...project,
      providers: mergedProviders,
    };
  }

  getActiveProviderConfig(): ProviderConfig | undefined {
    const settings = this.getEffectiveSettings();
    const active = (settings.active_provider || "grok").toLowerCase();
    return settings.providers?.[active];
  }

  getCurrentModel(): string {
    const config = this.getActiveProviderConfig();
    return config?.model || config?.default_model || "grok-code-fast-1";
  }

  setCurrentModel(model: string): void {
    const active = this.userSettings.active_provider || "grok";
    if (this.userSettings.providers[active]) {
      this.userSettings.providers[active].model = model;
    }
  }

  setActiveProvider(providerId: string): void {
    this.userSettings.active_provider = providerId;
  }

  getApiKey(): string | undefined {
    const config = this.getActiveProviderConfig();
    return config?.api_key;
  }

  getBaseURL(): string | undefined {
    const config = this.getActiveProviderConfig();
    return config?.base_url;
  }

  getAvailableModels(providerId?: string): string[] {
    return ["mock-model-1", "mock-model-2", "mock-model-3"];
  }

  async fetchModelsForProvider(
    providerId: string,
    forceRefresh: boolean = false,
  ): Promise<string[]> {
    return this.getAvailableModels(providerId);
  }

  getStorageDirectory(): string {
    return "/mock/storage/directory";
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setUserSettings(settings: UserSettings): void {
    this.userSettings = settings;
  }

  setProjectSettings(settings: Partial<UserSettings>): void {
    this.projectSettings = settings;
  }

  reset(): void {
    this.userSettings = this.getDefaultSettings();
    this.projectSettings = {};
    this.shouldFail = false;
  }
}

let instance: MockSettingsManager | null = null;

export function getMockSettingsManager(): MockSettingsManager {
  if (!instance) {
    instance = new MockSettingsManager();
  }
  return instance;
}

export function resetMockSettingsManager(): void {
  instance = null;
}
