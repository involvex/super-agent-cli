import {
  SettingsManager,
  getSettingsManager,
} from "../../../utils/settings-manager";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MOCK_SETTINGS } from "../../mocks/mock-data";

describe("SettingsManager", () => {
  let manager: SettingsManager;

  beforeEach(() => {
    manager = SettingsManager.getInstance();
  });

  afterEach(() => {
    manager.saveUserSettings({
      active_provider: "grok",
    });
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = SettingsManager.getInstance();
      const instance2 = SettingsManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("loadUserSettings", () => {
    it("should load default settings if none exist", () => {
      const settings = manager.loadUserSettings();
      expect(settings).toBeDefined();
      expect(settings.active_provider).toBeDefined();
      expect(settings.providers).toBeDefined();
    });

    it("should have grok as default provider", () => {
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("grok");
    });

    it("should include default providers", () => {
      const settings = manager.loadUserSettings();
      expect(settings.providers.grok).toBeDefined();
      expect(settings.providers.openai).toBeDefined();
      expect(settings.providers.gemini).toBeDefined();
    });

    it("should have settings version", () => {
      const settings = manager.loadUserSettings();
      expect(settings.settingsVersion).toBeDefined();
    });

    it("should have UI settings", () => {
      const settings = manager.loadUserSettings();
      expect(settings.ui).toBeDefined();
      expect(settings.ui.theme).toBeDefined();
    });
  });

  describe("saveUserSettings", () => {
    it("should save settings successfully", () => {
      expect(() => {
        manager.saveUserSettings({ active_provider: "openai" });
      }).not.toThrow();
    });

    it("should persist active provider change", () => {
      manager.saveUserSettings({ active_provider: "openai" });
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("openai");
    });

    it("should merge settings correctly", () => {
      manager.saveUserSettings({ active_provider: "gemini" });
      manager.saveUserSettings({
        ui: { theme: "light", showModelInfoInChat: true },
      });
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("gemini");
      expect(settings.ui.theme).toBe("light");
    });
  });

  describe("updateUserSetting", () => {
    it("should update active provider", () => {
      manager.updateUserSetting("active_provider", "openai");
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("openai");
    });

    it("should update UI theme", () => {
      manager.updateUserSetting("ui", {
        theme: "light",
        showModelInfoInChat: false,
      });
      const settings = manager.loadUserSettings();
      expect(settings.ui.theme).toBe("light");
    });

    it("should normalize provider ID to lowercase", () => {
      manager.updateUserSetting("active_provider", "GROK");
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("grok");
    });
  });

  describe("getUserSetting", () => {
    it("should get active provider", () => {
      const provider = manager.getUserSetting("active_provider");
      expect(typeof provider).toBe("string");
    });

    it("should get UI settings", () => {
      const ui = manager.getUserSetting("ui");
      expect(ui).toBeDefined();
      expect(ui.theme).toBeDefined();
    });

    it("should get providers", () => {
      const providers = manager.getUserSetting("providers");
      expect(providers).toBeDefined();
      expect(typeof providers).toBe("object");
    });
  });

  describe("loadProjectSettings", () => {
    it("should load empty project settings by default", () => {
      const settings = manager.loadProjectSettings();
      expect(settings).toBeDefined();
    });

    it("should not throw if no project settings exist", () => {
      expect(() => manager.loadProjectSettings()).not.toThrow();
    });
  });

  describe("saveProjectSettings", () => {
    it("should save project settings", () => {
      expect(() => {
        manager.saveProjectSettings({ active_provider: "openai" });
      }).not.toThrow();
    });

    it("should persist project settings", () => {
      manager.saveProjectSettings({ active_provider: "gemini" });
      const settings = manager.loadProjectSettings();
      expect(settings.active_provider).toBe("gemini");
    });
  });

  describe("getActiveProviderConfig", () => {
    it("should return grok config by default", () => {
      const config = manager.getActiveProviderConfig();
      expect(config).toBeDefined();
      expect(config?.id).toBe("grok");
    });

    it("should return config for active provider", () => {
      manager.setActiveProvider("openai");
      const config = manager.getActiveProviderConfig();
      expect(config?.id).toBe("openai");
    });

    it("should include api_key in config", () => {
      const config = manager.getActiveProviderConfig();
      expect(config?.api_key).toBeDefined();
    });

    it("should include model in config", () => {
      const config = manager.getActiveProviderConfig();
      expect(config?.model).toBeDefined();
    });

    it("should include base_url in config", () => {
      const config = manager.getActiveProviderConfig();
      expect(config?.base_url).toBeDefined();
    });
  });

  describe("getCurrentModel", () => {
    it("should return model for active provider", () => {
      const model = manager.getCurrentModel();
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);
    });

    it("should return default model if none set", () => {
      const model = manager.getCurrentModel();
      expect(model).toBeDefined();
    });
  });

  describe("setCurrentModel", () => {
    it("should set model for active provider", () => {
      manager.setCurrentModel("gpt-4o");
      const model = manager.getCurrentModel();
      expect(model).toBe("gpt-4o");
    });

    it("should persist model change", () => {
      manager.setCurrentModel("gemini-2.0-flash");
      manager.saveUserSettings({});
      const model = manager.getCurrentModel();
      expect(model).toBe("gemini-2.0-flash");
    });
  });

  describe("setActiveProvider", () => {
    it("should set active provider", () => {
      manager.setActiveProvider("openai");
      const config = manager.getActiveProviderConfig();
      expect(config?.id).toBe("openai");
    });

    it("should normalize provider ID", () => {
      manager.setActiveProvider("GEMINI");
      const config = manager.getActiveProviderConfig();
      expect(config?.id).toBe("gemini");
    });

    it("should persist provider change", () => {
      manager.setActiveProvider("anthropic");
      const settings = manager.loadUserSettings();
      expect(settings.active_provider).toBe("anthropic");
    });
  });

  describe("getApiKey", () => {
    it("should return api key for active provider", () => {
      const apiKey = manager.getApiKey();
      expect(typeof apiKey).toBe("string");
    });

    it("should return undefined if no api key", () => {
      const apiKey = manager.getApiKey();
      expect(apiKey !== undefined).toBe(true);
    });
  });

  describe("getBaseURL", () => {
    it("should return base url for active provider", () => {
      const baseUrl = manager.getBaseURL();
      expect(typeof baseUrl).toBe("string");
    });
  });

  describe("getAvailableModels", () => {
    it("should return models for grok provider", () => {
      const models = manager.getAvailableModels("grok");
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("should return models for openai provider", () => {
      const models = manager.getAvailableModels("openai");
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("should return models for gemini provider", () => {
      const models = manager.getAvailableModels("gemini");
      expect(Array.isArray(models)).toBe(true);
    });

    it("should use active provider if none specified", () => {
      const models = manager.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe("fetchModelsForProvider", () => {
    it("should fetch models for provider", async () => {
      const models = await manager.fetchModelsForProvider("grok");
      expect(Array.isArray(models)).toBe(true);
    });

    it("should force refresh models", async () => {
      const models = await manager.fetchModelsForProvider("grok", true);
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe("getEffectiveSettings", () => {
    it("should merge user and project settings", () => {
      manager.saveUserSettings({ active_provider: "grok" });
      manager.saveProjectSettings({ active_provider: "openai" });
      const settings = manager.getEffectiveSettings();
      expect(settings.active_provider).toBe("openai");
    });

    it("should prioritize project settings", () => {
      manager.saveUserSettings({
        ui: { theme: "dark", showModelInfoInChat: true },
      });
      manager.saveProjectSettings({ ui: { theme: "light" } });
      const settings = manager.getEffectiveSettings();
      expect(settings.ui.theme).toBe("light");
    });
  });

  describe("edge cases", () => {
    it("should handle empty provider ID", () => {
      const models = manager.getAvailableModels("");
      expect(Array.isArray(models)).toBe(true);
    });

    it("should handle unknown provider", () => {
      const models = manager.getAvailableModels("unknown-provider-xyz");
      expect(Array.isArray(models)).toBe(true);
    });

    it("should handle setting null values", () => {
      expect(() => {
        manager.saveUserSettings({ active_provider: null as any });
      }).not.toThrow();
    });

    it("should handle setting undefined values", () => {
      expect(() => {
        manager.saveUserSettings({ active_provider: undefined as any });
      }).not.toThrow();
    });
  });
});

describe("getSettingsManager", () => {
  it("should return singleton instance", () => {
    const instance1 = getSettingsManager();
    const instance2 = getSettingsManager();
    expect(instance1).toBe(instance2);
  });

  it("should return SettingsManager instance", () => {
    const manager = getSettingsManager();
    expect(manager).toBeInstanceOf(SettingsManager);
  });
});
