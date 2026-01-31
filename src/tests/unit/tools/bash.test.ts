import {
  getMockConfirmationService,
  resetMockConfirmationService,
} from "../../mocks/mock-confirmation-service";
import {
  assertToolResultSuccess,
  assertToolResultFailure,
} from "../../test-helpers";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BashTool } from "../../../tools/bash";

describe("BashTool", () => {
  let tool: BashTool;
  let mockConfirmation: ReturnType<typeof getMockConfirmationService>;

  beforeEach(() => {
    mockConfirmation = getMockConfirmationService();
    mockConfirmation.reset();
    mockConfirmation.setSessionFlags({
      fileOperations: false,
      bashCommands: true,
      allOperations: false,
    });

    tool = new BashTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockConfirmationService();
  });

  describe("execute", () => {
    it.skip("should execute simple command", async () => {
      const result = await tool.execute('echo "test"');
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with output", async () => {
      const result = await tool.execute('echo "hello world"');
      assertToolResultSuccess(result, "hello world");
    });

    it.skip("should execute pwd command", async () => {
      const result = await tool.execute("pwd");
      assertToolResultSuccess(result);
    });

    it.skip("should execute ls command", async () => {
      const result = await tool.execute("ls");
      assertToolResultSuccess(result);
    });

    it.skip("should handle empty command", async () => {
      const result = await tool.execute("");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with spaces", async () => {
      const result = await tool.execute('echo "test with spaces"');
      assertToolResultSuccess(result, "test with spaces");
    });

    it.skip("should handle command with special characters", async () => {
      const result = await tool.execute("echo 'test!@#$%'");
      assertToolResultSuccess(result);
    });

    it.skip("should handle failed command", async () => {
      const result = await tool.execute("nonexistent-command-xyz123");
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it.skip("should handle command timeout", async () => {
      const result = await tool.execute("sleep 100", 100);
      expect(result).toBeDefined();
    });

    it.skip("should handle command with stderr", async () => {
      const result = await tool.execute("ls /nonexistent 2>&1");
      expect(result).toBeDefined();
    });

    it.skip("should handle command with large output", async () => {
      const result = await tool.execute(
        'echo "x"; for i in {1..1000}; do echo "line $i"; done',
      );
      expect(result).toBeDefined();
    });
  });

  describe("cd command", () => {
    it.skip("should change to existing directory", async () => {
      const result = await tool.execute("cd /tmp");
      assertToolResultSuccess(result, "Changed directory");
    });

    it.skip("should handle cd to non-existent directory", async () => {
      const result = await tool.execute("cd /nonexistent-directory-xyz");
      assertToolResultFailure(result, "Cannot change directory");
    });

    it.skip("should track current directory", async () => {
      const initialDir = tool.getCurrentDirectory();
      await tool.execute("cd /tmp");
      const newDir = tool.getCurrentDirectory();
      expect(newDir).not.toBe(initialDir);
    });

    it.skip("should handle cd to parent directory", async () => {
      await tool.execute("cd /tmp");
      const beforeCd = tool.getCurrentDirectory();
      await tool.execute("cd ..");
      const afterCd = tool.getCurrentDirectory();
      expect(beforeCd).not.toBe(afterCd);
    });

    it.skip("should handle cd to current directory", async () => {
      const result = await tool.execute("cd .");
      assertToolResultSuccess(result);
    });
  });

  describe("command cancellation", () => {
    it.skip("should handle command cancellation", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
      });
      mockConfirmation.setNextConfirmation({ confirmed: false });
      const result = await tool.execute("echo test");
      assertToolResultFailure(result, "cancelled");
    });

    it.skip("should show command in confirmation", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
      });
      mockConfirmation.setNextConfirmation({
        confirmed: false,
        feedback: "User cancelled",
      });
      const result = await tool.execute("echo test");
      assertToolResultFailure(result, "User cancelled");
    });
  });

  describe("auto-approve all operations", () => {
    it.skip("should execute without confirmation when all operations approved", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: true,
      });
      const result = await tool.execute("echo test");
      assertToolResultSuccess(result);
    });
  });

  describe("listFiles", () => {
    it.skip("should list files in current directory", async () => {
      const result = await tool.listFiles();
      assertToolResultSuccess(result);
    });

    it.skip("should list files in specified directory", async () => {
      const result = await tool.listFiles("/tmp");
      assertToolResultSuccess(result);
    });
  });

  describe("findFiles", () => {
    it.skip("should find files by pattern", async () => {
      const result = await tool.findFiles("*.txt", ".");
      expect(result).toBeDefined();
    });

    it.skip("should handle find with no results", async () => {
      const result = await tool.findFiles("nonexistent-pattern-xyz", ".");
      expect(result).toBeDefined();
    });
  });

  describe("grep", () => {
    it.skip("should search for pattern in files", async () => {
      const result = await tool.grep("function", ".");
      expect(result).toBeDefined();
    });

    it.skip("should handle grep with no matches", async () => {
      const result = await tool.grep("nonexistent-pattern-xyz", ".");
      expect(result).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it.skip("should handle command with pipes", async () => {
      const result = await tool.execute("echo 'test' | wc -c");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with redirects", async () => {
      const result = await tool.execute("echo 'test' > /tmp/test-output.txt");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with variables", async () => {
      const result = await tool.execute('VAR="test"; echo $VAR');
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with backticks", async () => {
      const result = await tool.execute("echo `date`");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with semicolons", async () => {
      const result = await tool.execute("echo 'first'; echo 'second'");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with ampersands", async () => {
      const result = await tool.execute("echo 'first' && echo 'second'");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with double pipes", async () => {
      const result = await tool.execute("false || echo 'fallback'");
      assertToolResultSuccess(result, "fallback");
    });

    it.skip("should handle command with newlines", async () => {
      const result = await tool.execute("echo 'line1'\necho 'line2'");
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with tabs", async () => {
      const result = await tool.execute("echo\t'test'");
      assertToolResultSuccess(result);
    });

    it.skip("should handle very long command", async () => {
      const longCommand = "echo '" + "a".repeat(10000) + "'";
      const result = await tool.execute(longCommand);
      expect(result).toBeDefined();
    });

    it.skip("should handle command with unicode", async () => {
      const result = await tool.execute('echo "你好世界 🎉"');
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with quotes", async () => {
      const result = await tool.execute('echo "it\'s a test"');
      assertToolResultSuccess(result);
    });

    it.skip("should handle command with escape sequences", async () => {
      const result = await tool.execute('echo "test\\n"');
      assertToolResultSuccess(result);
    });
  });

  describe("getCurrentDirectory", () => {
    it.skip("should return current directory", () => {
      const dir = tool.getCurrentDirectory();
      expect(typeof dir).toBe("string");
      expect(dir.length).toBeGreaterThan(0);
    });
  });
});
