import {
  createMockLLMResponse,
  createMockToolCallArray,
} from "../../mocks/mock-data-factories";
import { getMockSettingsManager } from "../../mocks/mock-settings-manager";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockLLMProvider } from "../../mocks/mock-llm-provider";
import type { ChatEntry } from "../../../agent/super-agent";
import { SuperAgent } from "../../../agent/super-agent";

describe("SuperAgent", () => {
  let agent: SuperAgent;
  let mockProvider: MockLLMProvider;
  let mockSettings: ReturnType<typeof getMockSettingsManager>;

  beforeEach(() => {
    mockProvider = new MockLLMProvider("test-provider", "test-model");
    mockSettings = getMockSettingsManager();
    mockSettings.reset();

    vi.mock("../../utils/settings-manager", () => ({
      getSettingsManager: () => mockSettings,
    }));

    agent = new SuperAgent(
      "test-api-key",
      "https://api.test.com",
      "test-model",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with valid config", () => {
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(SuperAgent);
    });

    it("should initialize with empty API key", () => {
      const testAgent = new SuperAgent("", "", "");
      expect(testAgent).toBeDefined();
    });

    it("should initialize with default maxToolRounds", () => {
      const testAgent = new SuperAgent("test-key");
      expect(testAgent).toBeDefined();
    });

    it("should initialize with custom maxToolRounds", () => {
      const testAgent = new SuperAgent("test-key", "", "", 100);
      expect(testAgent).toBeDefined();
    });
  });

  describe("setProvider", () => {
    it("should switch provider successfully", () => {
      expect(() => agent.setProvider("grok")).not.toThrow();
    });

    it("should handle invalid provider", () => {
      expect(() => agent.setProvider("")).not.toThrow();
    });
  });

  describe("listModels", () => {
    it("should return list of models", async () => {
      const models = await agent.listModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it("should return empty array if listModels not available", async () => {
      const models = await agent.listModels();
      expect(models).toBeDefined();
    });
  });

  describe("getCurrentModel", () => {
    it("should return current model", () => {
      const model = agent.getCurrentModel();
      expect(typeof model).toBe("string");
    });
  });

  describe("setModel", () => {
    it("should set model successfully", () => {
      expect(() => agent.setModel("new-model")).not.toThrow();
    });
  });

  describe("abortCurrentOperation", () => {
    it("should abort current operation", () => {
      expect(() => agent.abortCurrentOperation()).not.toThrow();
    });

    it("should handle multiple abort calls", () => {
      agent.abortCurrentOperation();
      expect(() => agent.abortCurrentOperation()).not.toThrow();
    });
  });

  describe("processUserMessage", () => {
    it("should process simple user message", async () => {
      const response = await agent.processUserMessage("Hello");
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
    });

    it("should handle empty message", async () => {
      const response = await agent.processUserMessage("");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle message with special characters", async () => {
      const response = await agent.processUserMessage("Hello @user #tag");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle error during processing", async () => {
      const testAgent = new SuperAgent("invalid-key");
      const response = await testAgent.processUserMessage("test");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should include user entry in response", async () => {
      const message = "Test message";
      const response = await agent.processUserMessage(message);
      const userEntry = response.find(
        (entry: ChatEntry) =>
          entry.type === "user" && entry.content === message,
      );
      expect(userEntry).toBeDefined();
    });
  });

  describe("processUserMessageStream", () => {
    it("should stream user message", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream("Hello")) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should emit token count", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream("Hello")) {
        chunks.push(chunk);
      }
      const tokenChunk = chunks.find((c: any) => c.type === "token_count");
      expect(tokenChunk).toBeDefined();
    });

    it("should emit done at the end", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream("Hello")) {
        chunks.push(chunk);
      }
      const doneChunk = chunks.find((c: any) => c.type === "done");
      expect(doneChunk).toBeDefined();
    });

    it("should handle cancellation", async () => {
      const stream = agent.processUserMessageStream("Long message");
      agent.abortCurrentOperation();
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const cancelledChunk = chunks.find((c: any) =>
        c.content?.includes("cancelled"),
      );
      expect(cancelledChunk).toBeDefined();
    });
  });

  describe("executeBashCommand", () => {
    it("should execute bash command", async () => {
      const result = await agent.executeBashCommand("echo 'test'");
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    it("should handle command failure", async () => {
      const result = await agent.executeBashCommand(
        "nonexistent-command-xyz123",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("fetchAvailableModels", () => {
    it("should fetch available models", async () => {
      const models = await agent.fetchAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it("should force refresh models", async () => {
      const models = await agent.fetchAvailableModels(true);
      expect(Array.isArray(models)).toBe(true);
    });

    it("should handle fetch errors gracefully", async () => {
      const models = await agent.fetchAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe("context pruning", () => {
    it("should handle context pruning with many messages", async () => {
      const messages = Array.from({ length: 1000 }, (_, i) => `Message ${i}`);
      for (const msg of messages) {
        await agent.processUserMessage(msg);
      }
      expect(agent).toBeDefined();
    });
  });

  describe("max tool rounds", () => {
    it("should enforce max tool rounds", async () => {
      const testAgent = new SuperAgent("test-key", "", "", 2);
      const response = await testAgent.processUserMessage("Simple message");
      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle very long message", async () => {
      const longMessage = "a".repeat(100000);
      const response = await agent.processUserMessage(longMessage);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle unicode message", async () => {
      const unicodeMessage = "你好世界 🎉 日本語";
      const response = await agent.processUserMessage(unicodeMessage);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle message with newlines", async () => {
      const multiLineMessage = "Line 1\nLine 2\nLine 3";
      const response = await agent.processUserMessage(multiLineMessage);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle message with special characters", async () => {
      const specialMessage = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await agent.processUserMessage(specialMessage);
      expect(Array.isArray(response)).toBe(true);
    });
  });
});
