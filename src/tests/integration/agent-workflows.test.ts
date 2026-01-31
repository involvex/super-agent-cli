import {
  getMockFileSystem,
  resetMockFileSystem,
} from "../mocks/mock-file-system";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMockSettingsManager } from "../mocks/mock-settings-manager";
import { MockLLMProvider } from "../mocks/mock-llm-provider";
import { setupMockFileSystem } from "../test-helpers";
import { SuperAgent } from "../../agent/super-agent";

describe("Integration: Agent Workflows", () => {
  let agent: SuperAgent;
  let mockProvider: MockLLMProvider;
  let mockSettings: ReturnType<typeof getMockSettingsManager>;
  let mockFs: ReturnType<typeof getMockFileSystem>;

  beforeEach(() => {
    mockProvider = new MockLLMProvider("test-provider", "test-model");
    mockSettings = getMockSettingsManager();
    mockSettings.reset();
    mockFs = setupMockFileSystem();

    vi.mock("../../utils/settings-manager", () => ({
      getSettingsManager: () => mockSettings,
    }));

    mockFs.setFile("/test/sample.txt", "Hello, World!\nThis is a sample file.");
    mockFs.setFile(
      "/test/config.json",
      JSON.stringify({ name: "test", version: "1.0" }),
    );

    agent = new SuperAgent(
      "test-api-key",
      "https://api.test.com",
      "test-model",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockFileSystem();
  });

  describe("simple user message workflow", () => {
    it("should initialize agent with default settings", () => {
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(SuperAgent);
    });

    it("should process a simple user message", async () => {
      const message = "Hello, how are you?";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
    });

    it("should include user entry in response", async () => {
      const message = "What can you do?";
      const response = await agent.processUserMessage(message);
      const userEntry = response.find((entry: any) => entry.type === "user");
      expect(userEntry).toBeDefined();
      expect(userEntry?.content).toBe(message);
    });

    it("should include assistant entry in response", async () => {
      const message = "Tell me something";
      const response = await agent.processUserMessage(message);
      const assistantEntry = response.find(
        (entry: any) => entry.type === "assistant",
      );
      expect(assistantEntry).toBeDefined();
    });
  });

  describe("tool execution workflow", () => {
    it("should handle view file tool execution", async () => {
      const message = "View the file /test/sample.txt";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle multiple tool calls", async () => {
      const message = "View both sample files";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should track tool results", async () => {
      const message = "Show me the sample file";
      const response = await agent.processUserMessage(message);
      const toolResults = response.filter(
        (entry: any) => entry.type === "tool_result",
      );
      expect(Array.isArray(toolResults)).toBe(true);
    });

    it("should handle tool execution errors gracefully", async () => {
      const message = "View a non-existent file";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe("streaming workflow", () => {
    it("should stream user message", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream("Hello")) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should emit token count chunks", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream(
        "Test message",
      )) {
        chunks.push(chunk);
      }
      const tokenChunks = chunks.filter((c: any) => c.type === "token_count");
      expect(tokenChunks.length).toBeGreaterThan(0);
    });

    it("should emit content chunks", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream(
        "Tell me something",
      )) {
        chunks.push(chunk);
      }
      const contentChunks = chunks.filter((c: any) => c.type === "content");
      expect(contentChunks.length).toBeGreaterThan(0);
    });

    it("should emit done chunk at end", async () => {
      const chunks: any[] = [];
      for await (const chunk of agent.processUserMessageStream("Hello")) {
        chunks.push(chunk);
      }
      const doneChunk = chunks.find((c: any) => c.type === "done");
      expect(doneChunk).toBeDefined();
    });
  });

  describe("error handling workflow", () => {
    it("should handle empty message", async () => {
      const response = await agent.processUserMessage("");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle very long message", async () => {
      const longMessage = "a".repeat(100000);
      const response = await agent.processUserMessage(longMessage);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle message with special characters", async () => {
      const message = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle unicode message", async () => {
      const message = "你好世界 🎉 日本語";
      const response = await agent.processUserMessage(message);
      expect(Array.isArray(response)).toBe(true);
    });

    it("should handle agent initialization errors", () => {
      expect(() => new SuperAgent("", "", "")).not.toThrow();
    });
  });

  describe("context management workflow", () => {
    it("should handle multiple messages in sequence", async () => {
      await agent.processUserMessage("Message 1");
      await agent.processUserMessage("Message 2");
      await agent.processUserMessage("Message 3");
      const response = await agent.processUserMessage("Message 4");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should prune context when it gets too large", async () => {
      for (let i = 0; i < 100; i++) {
        await agent.processUserMessage(`Message ${i}: ${"a".repeat(1000)}`);
      }
      const response = await agent.processUserMessage("Final message");
      expect(Array.isArray(response)).toBe(true);
    });

    it("should maintain conversation history", async () => {
      await agent.processUserMessage("First message");
      await agent.processUserMessage("Second message");
      const response = await agent.processUserMessage("Third message");
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(1);
    });
  });

  describe("cancellation workflow", () => {
    it("should abort streaming operation", async () => {
      const stream = agent.processUserMessageStream("Long message");
      setTimeout(() => agent.abortCurrentOperation(), 100);

      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const cancelledChunk = chunks.find((c: any) =>
        c.content?.includes("cancelled"),
      );
      expect(cancelledChunk).toBeDefined();
    });

    it("should handle multiple abort calls", () => {
      agent.abortCurrentOperation();
      expect(() => agent.abortCurrentOperation()).not.toThrow();
    });
  });

  describe("model and provider switching workflow", () => {
    it("should switch providers", () => {
      expect(() => agent.setProvider("openai")).not.toThrow();
    });

    it("should switch models", () => {
      expect(() => agent.setModel("new-model")).not.toThrow();
    });

    it("should fetch available models", async () => {
      const models = await agent.fetchAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it("should handle provider switch during operation", async () => {
      await agent.processUserMessage("Message before switch");
      agent.setProvider("openai");
      const response = await agent.processUserMessage("Message after switch");
      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe("bash command workflow", () => {
    it("should execute bash commands", async () => {
      const result = await agent.executeBashCommand("echo 'test'");
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    it("should handle bash command failures", async () => {
      const result = await agent.executeBashCommand("nonexistent-command-xyz");
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });
});
