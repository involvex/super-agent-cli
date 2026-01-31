import type {
  LLMMessage,
  LLMToolCall,
  LLMResponse,
} from "../../../core/llm-provider";
import {
  MockLLMProvider,
  createMockLLMProvider,
} from "../../mocks/mock-llm-provider";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("MockLLMProvider", () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = createMockLLMProvider("test-provider", "test-model");
  });

  describe("constructor", () => {
    it("should create provider with default values", () => {
      const defaultProvider = new MockLLMProvider();
      expect(defaultProvider.name).toBe("mock-provider");
      expect(defaultProvider.getCurrentModel()).toBe("mock-model");
    });

    it("should create provider with custom values", () => {
      expect(provider.name).toBe("test-provider");
      expect(provider.getCurrentModel()).toBe("test-model");
    });
  });

  describe("setModel", () => {
    it("should set model successfully", () => {
      provider.setModel("new-model");
      expect(provider.getCurrentModel()).toBe("new-model");
    });

    it("should handle empty model name", () => {
      provider.setModel("");
      expect(provider.getCurrentModel()).toBe("");
    });
  });

  describe("getCurrentModel", () => {
    it("should return current model", () => {
      expect(provider.getCurrentModel()).toBe("test-model");
    });
  });

  describe("chat", () => {
    it("should return mock response", async () => {
      const messages: LLMMessage[] = [{ role: "user", content: "Hello" }];
      const response = await provider.chat(messages);
      expect(response).toBeDefined();
      expect(response.choices).toBeDefined();
      expect(response.choices.length).toBeGreaterThan(0);
    });

    it("should use next response if set", async () => {
      const customResponse: LLMResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Custom response",
              tool_calls: [],
            },
            finish_reason: "stop",
          },
        ],
      };
      provider.setNextResponse(customResponse);
      const response = await provider.chat([]);
      expect(response.choices[0].message.content).toBe("Custom response");
    });

    it("should handle multiple queued responses", async () => {
      provider.setNextResponse({
        choices: [
          {
            message: { role: "assistant", content: "First", tool_calls: [] },
            finish_reason: "stop",
          },
        ],
      });
      provider.setNextResponse({
        choices: [
          {
            message: { role: "assistant", content: "Second", tool_calls: [] },
            finish_reason: "stop",
          },
        ],
      });

      const response1 = await provider.chat([]);
      const response2 = await provider.chat([]);

      expect(response1.choices[0].message.content).toBe("First");
      expect(response2.choices[0].message.content).toBe("Second");
    });

    it("should throw error when shouldFail is true", async () => {
      provider.setShouldFail(true, "Custom error message");
      await expect(provider.chat([])).rejects.toThrow("Custom error message");
    });

    it("should handle tool calls in response", async () => {
      const toolCall: LLMToolCall = {
        id: "call_123",
        type: "function",
        function: {
          name: "test_function",
          arguments: '{"param": "value"}',
        },
      };
      provider.setNextResponse({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [toolCall],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const response = await provider.chat([]);
      expect(response.choices[0].message.tool_calls).toEqual([toolCall]);
    });

    it("should handle empty messages array", async () => {
      const response = await provider.chat([]);
      expect(response).toBeDefined();
    });

    it("should handle messages with system role", async () => {
      const messages: LLMMessage[] = [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ];
      const response = await provider.chat(messages);
      expect(response).toBeDefined();
    });
  });

  describe("chatStream", () => {
    it("should stream response", async () => {
      const chunks: any[] = [];
      const messages: LLMMessage[] = [{ role: "user", content: "Hello" }];

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].choices).toBeDefined();
    });

    it("should use custom streaming chunks if set", async () => {
      const customChunks = [
        { choices: [{ delta: { content: "C" } }] },
        { choices: [{ delta: { content: "u" } }] },
        { choices: [{ delta: { content: "s" } }] },
        { choices: [{ delta: { content: "t" } }] },
      ];
      provider.setNextStreamingResponses(customChunks);

      const chunks: any[] = [];
      for await (const chunk of provider.chatStream([])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(customChunks);
    });

    it("should throw error when shouldFail is true", async () => {
      provider.setShouldFail(true, "Stream error");

      await expect(async () => {
        for await (const _ of provider.chatStream([])) {
        }
      }).rejects.toThrow("Stream error");
    });

    it("should handle tool calls in stream", async () => {
      const toolCallChunk = {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_123",
                  type: "function",
                  function: {
                    name: "test_function",
                    arguments: "",
                  },
                },
              ],
            },
          },
        ],
      };
      provider.setNextStreamingResponses([toolCallChunk]);

      const chunks: any[] = [];
      for await (const chunk of provider.chatStream([])) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle empty stream", async () => {
      provider.setNextStreamingResponses([]);

      const chunks: any[] = [];
      for await (const chunk of provider.chatStream([])) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(0);
    });
  });

  describe("listModels", () => {
    it("should return list of models", async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("should return expected model names", async () => {
      const models = await provider.listModels();
      expect(models[0]).toBe("mock-model-1");
      expect(models[1]).toBe("mock-model-2");
      expect(models[2]).toBe("mock-model-3");
    });
  });

  describe("setShouldFail", () => {
    it("should set fail state", () => {
      provider.setShouldFail(true);
      expect(() => provider.chat([])).rejects.toThrow();
    });

    it("should use custom error message", async () => {
      provider.setShouldFail(true, "Custom error");
      await expect(provider.chat([])).rejects.toThrow("Custom error");
    });

    it("should reset fail state", async () => {
      provider.setShouldFail(true);
      await expect(provider.chat([])).rejects.toThrow();

      provider.setShouldFail(false);
      await expect(provider.chat([])).resolves.toBeDefined();
    });
  });

  describe("reset", () => {
    it("should clear queued responses", async () => {
      provider.setNextResponse({
        choices: [
          {
            message: { role: "assistant", content: "Custom", tool_calls: [] },
            finish_reason: "stop",
          },
        ],
      });

      provider.reset();

      const response = await provider.chat([]);
      expect(response.choices[0].message.content).toBe("Mock response");
    });

    it("should clear streaming chunks", async () => {
      provider.setNextStreamingResponses([
        { choices: [{ delta: { content: "Custom" } }] },
      ]);

      provider.reset();

      const chunks: any[] = [];
      for await (const chunk of provider.chatStream([])) {
        chunks.push(chunk);
      }

      expect(chunks[0].choices[0].delta.content).toBe("Mock ");
    });

    it("should reset fail state", async () => {
      provider.setShouldFail(true);
      provider.reset();

      await expect(provider.chat([])).resolves.toBeDefined();
    });

    it("should reset all state", async () => {
      provider.setNextResponse({
        choices: [
          {
            message: { role: "assistant", content: "Custom", tool_calls: [] },
            finish_reason: "stop",
          },
        ],
      });
      provider.setShouldFail(true);
      provider.setModel("new-model");

      provider.reset();

      expect(provider.getCurrentModel()).toBe("test-model");
      await expect(provider.chat([])).resolves.toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle very long messages", async () => {
      const longMessage = "a".repeat(100000);
      const messages: LLMMessage[] = [{ role: "user", content: longMessage }];
      const response = await provider.chat(messages);
      expect(response).toBeDefined();
    });

    it("should handle unicode in messages", async () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "你好世界 🎉 日本語" },
      ];
      const response = await provider.chat(messages);
      expect(response).toBeDefined();
    });

    it("should handle many queued responses", async () => {
      for (let i = 0; i < 100; i++) {
        provider.setNextResponse({
          choices: [
            {
              message: {
                role: "assistant",
                content: `Response ${i}`,
                tool_calls: [],
              },
              finish_reason: "stop",
            },
          ],
        });
      }

      for (let i = 0; i < 100; i++) {
        const response = await provider.chat([]);
        expect(response.choices[0].message.content).toBe(`Response ${i}`);
      }
    });

    it("should handle response with null content", async () => {
      provider.setNextResponse({
        choices: [
          {
            message: { role: "assistant", content: null, tool_calls: [] },
            finish_reason: "stop",
          },
        ],
      });

      const response = await provider.chat([]);
      expect(response.choices[0].message.content).toBeNull();
    });

    it("should handle response with tool_calls but no content", async () => {
      provider.setNextResponse({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
                  function: { name: "test", arguments: "{}" },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const response = await provider.chat([]);
      expect(response.choices[0].message.content).toBeNull();
      expect(response.choices[0].message.tool_calls).toBeDefined();
    });
  });
});
