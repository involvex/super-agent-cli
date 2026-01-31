import {
  assertToolResultSuccess,
  assertToolResultFailure,
} from "../../test-helpers";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TodoTool } from "../../../tools/todo-tool";

describe("TodoTool", () => {
  let tool: TodoTool;

  beforeEach(() => {
    tool = new TodoTool();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTodoList", () => {
    it("should create todo list with valid todos", async () => {
      const todos = [
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "2", content: "Task 2", status: "pending", priority: "medium" },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should create empty todo list", async () => {
      const result = await tool.createTodoList([]);
      assertToolResultSuccess(result);
    });

    it("should handle todo with all fields", async () => {
      const todos = [
        {
          id: "test-1",
          content: "Complete task",
          status: "pending" as const,
          priority: "high" as const,
          description: "Task description",
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle todo with minimal fields", async () => {
      const todos = [
        {
          id: "1",
          content: "Simple task",
          status: "pending" as const,
          priority: "medium" as const,
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle todo with high priority", async () => {
      const todos = [
        {
          id: "1",
          content: "Urgent task",
          status: "pending",
          priority: "high",
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle todo with medium priority", async () => {
      const todos = [
        {
          id: "1",
          content: "Normal task",
          status: "pending",
          priority: "medium",
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle todo with low priority", async () => {
      const todos = [
        {
          id: "1",
          content: "Optional task",
          status: "pending",
          priority: "low",
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle todos with mixed priorities", async () => {
      const todos = [
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "2", content: "Task 2", status: "pending", priority: "medium" },
        { id: "3", content: "Task 3", status: "pending", priority: "low" },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle duplicate IDs", async () => {
      const todos = [
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "1", content: "Task 2", status: "pending", priority: "medium" },
      ];
      const result = await tool.createTodoList(todos);
      expect(result).toBeDefined();
    });

    it("should handle very long task descriptions", async () => {
      const longTask = "a".repeat(10000);
      const todos = [
        { id: "1", content: longTask, status: "pending", priority: "medium" },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle unicode in tasks", async () => {
      const todos = [
        {
          id: "1",
          content: "你好世界 🎉 日本語",
          status: "pending",
          priority: "medium",
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });
  });

  describe("updateTodoList", () => {
    beforeEach(async () => {
      await tool.createTodoList([
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "2", content: "Task 2", status: "pending", priority: "medium" },
        { id: "3", content: "Task 3", status: "pending", priority: "low" },
      ]);
    });

    it("should update todo status to in_progress", async () => {
      const updates = [{ id: "1", status: "in_progress" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should update todo status to completed", async () => {
      const updates = [{ id: "1", status: "completed" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should update todo priority", async () => {
      const updates = [{ id: "2", priority: "high" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should update todo task description", async () => {
      const updates = [{ id: "1", content: "Updated task" }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should update multiple todos", async () => {
      const updates = [
        { id: "1", status: "completed" as const },
        { id: "2", status: "in_progress" as const },
        { id: "3", priority: "high" as const },
      ];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should handle updating non-existent todo", async () => {
      const updates = [{ id: "999", status: "completed" as const }];
      const result = await tool.updateTodoList(updates);
      expect(result).toBeDefined();
    });

    it("should handle empty updates array", async () => {
      const result = await tool.updateTodoList([]);
      expect(result).toBeDefined();
    });

    it("should transition from pending to in_progress", async () => {
      const updates = [{ id: "1", status: "in_progress" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should transition from in_progress to completed", async () => {
      await tool.updateTodoList([{ id: "1", status: "in_progress" as const }]);
      const updates = [{ id: "1", status: "completed" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should handle status transition backwards", async () => {
      await tool.updateTodoList([{ id: "1", status: "completed" as const }]);
      const updates = [{ id: "1", status: "pending" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });
  });

  describe("status transitions", () => {
    beforeEach(async () => {
      await tool.createTodoList([
        { id: "1", content: "Task 1", status: "pending", priority: "medium" },
      ]);
    });

    it("should allow pending -> in_progress", async () => {
      const result = await tool.updateTodoList([
        { id: "1", status: "in_progress" as const },
      ]);
      assertToolResultSuccess(result);
    });

    it("should allow in_progress -> completed", async () => {
      await tool.updateTodoList([{ id: "1", status: "in_progress" as const }]);
      const result = await tool.updateTodoList([
        { id: "1", status: "completed" as const },
      ]);
      assertToolResultSuccess(result);
    });

    it("should allow pending -> completed", async () => {
      const result = await tool.updateTodoList([
        { id: "1", status: "completed" as const },
      ]);
      assertToolResultSuccess(result);
    });

    it("should allow completed -> pending", async () => {
      await tool.updateTodoList([{ id: "1", status: "completed" as const }]);
      const result = await tool.updateTodoList([
        { id: "1", status: "pending" as const },
      ]);
      assertToolResultSuccess(result);
    });

    it("should allow completed -> in_progress", async () => {
      await tool.updateTodoList([{ id: "1", status: "completed" as const }]);
      const result = await tool.updateTodoList([
        { id: "1", status: "in_progress" as const },
      ]);
      assertToolResultSuccess(result);
    });

    it("should allow in_progress -> pending", async () => {
      await tool.updateTodoList([{ id: "1", status: "in_progress" as const }]);
      const result = await tool.updateTodoList([
        { id: "1", status: "pending" as const },
      ]);
      assertToolResultSuccess(result);
    });
  });

  describe("edge cases", () => {
    it("should handle very large todo list", async () => {
      const todos = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        content: `Task ${i}`,
        status: "pending" as const,
        priority: "medium" as const,
      }));
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle empty task string", async () => {
      const todos = [
        {
          id: "1",
          content: "",
          status: "pending" as const,
          priority: "medium" as const,
        },
      ];
      const result = await tool.createTodoList(todos);
      expect(result).toBeDefined();
    });

    it("should handle special characters in tasks", async () => {
      const todos = [
        {
          id: "1",
          content: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
          status: "pending" as const,
          priority: "medium" as const,
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle newlines in tasks", async () => {
      const todos = [
        {
          id: "1",
          content: "Line 1\nLine 2\nLine 3",
          status: "pending" as const,
          priority: "medium" as const,
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });

    it("should handle tabs in tasks", async () => {
      const todos = [
        {
          id: "1",
          content: "Tab\there",
          status: "pending" as const,
          priority: "medium" as const,
        },
      ];
      const result = await tool.createTodoList(todos);
      assertToolResultSuccess(result);
    });
  });

  describe("remove todos", () => {
    beforeEach(async () => {
      await tool.createTodoList([
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "2", content: "Task 2", status: "pending", priority: "medium" },
        { id: "3", content: "Task 3", status: "pending", priority: "low" },
      ]);
    });

    it("should remove todo by ID", async () => {
      const updates = [{ id: "2", action: "remove" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should remove multiple todos", async () => {
      const updates = [
        { id: "1", action: "remove" as const },
        { id: "2", action: "remove" as const },
      ];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should handle removing non-existent todo", async () => {
      const updates = [{ id: "999", action: "remove" as const }];
      const result = await tool.updateTodoList(updates);
      expect(result).toBeDefined();
    });
  });

  describe("update priority handling", () => {
    beforeEach(async () => {
      await tool.createTodoList([
        { id: "1", content: "Task 1", status: "pending", priority: "medium" },
      ]);
    });

    it("should change priority from medium to high", async () => {
      const updates = [{ id: "1", priority: "high" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should change priority from medium to low", async () => {
      const updates = [{ id: "1", priority: "low" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });

    it("should change priority from low to high", async () => {
      await tool.updateTodoList([{ id: "1", priority: "low" as const }]);
      const updates = [{ id: "1", priority: "high" as const }];
      const result = await tool.updateTodoList(updates);
      assertToolResultSuccess(result);
    });
  });
});
