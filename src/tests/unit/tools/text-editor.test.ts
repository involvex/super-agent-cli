import {
  setupMockFileSystem,
  assertToolResultSuccess,
  assertToolResultFailure,
} from "../../test-helpers";
import {
  getMockFileSystem,
  resetMockFileSystem,
} from "../../mocks/mock-file-system";
import { getMockConfirmationService } from "../../mocks/mock-confirmation-service";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MOCK_FILES, INVALID_INPUTS } from "../../mocks/mock-data";
import { TextEditorTool } from "../../../tools/text-editor";

describe("TextEditorTool", () => {
  let tool: TextEditorTool;
  let mockFs: ReturnType<typeof getMockFileSystem>;
  let mockConfirmation: ReturnType<typeof getMockConfirmationService>;

  beforeEach(() => {
    mockFs = setupMockFileSystem();
    mockConfirmation = getMockConfirmationService();
    mockConfirmation.reset();
    mockConfirmation.setSessionFlags({
      fileOperations: true,
      bashCommands: false,
      allOperations: false,
    });

    tool = new TextEditorTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockFileSystem();
  });

  describe("view", () => {
    it("should view existing file", async () => {
      const result = await tool.view("/test/file.txt");
      assertToolResultSuccess(result, "Hello, World!");
    });

    it("should view directory", async () => {
      const result = await tool.view("/test");
      assertToolResultSuccess(result, "Directory contents");
    });

    it("should view file with line range", async () => {
      const result = await tool.view("/test/file.txt", [1, 2]);
      assertToolResultSuccess(result, "Lines 1-2");
    });

    it("should handle non-existent file", async () => {
      const result = await tool.view("/nonexistent/file.txt");
      assertToolResultFailure(result, "File or directory not found");
    });

    it("should handle invalid line range - start too large", async () => {
      const result = await tool.view("/test/file.txt", [1000, 1005]);
      assertToolResultFailure(result);
    });

    it("should handle invalid line range - end before start", async () => {
      const result = await tool.view("/test/file.txt", [5, 2]);
      assertToolResultFailure(result);
    });

    it("should handle negative line numbers", async () => {
      const result = await tool.view("/test/file.txt", [-1, 5]);
      assertToolResultFailure(result);
    });

    it("should view empty directory", async () => {
      const result = await tool.view("/test/empty-dir");
      assertToolResultSuccess(result);
    });

    it("should handle empty file", async () => {
      mockFs.setFile("/test/empty.txt", "");
      const result = await tool.view("/test/empty.txt");
      assertToolResultSuccess(result);
    });

    it("should handle file with special characters", async () => {
      mockFs.setFile("/test/special.txt", MOCK_FILES.specialCharacters.content);
      const result = await tool.view("/test/special.txt");
      assertToolResultSuccess(result);
    });

    it("should handle very large file", async () => {
      mockFs.setFile("/test/large.txt", "x".repeat(100000));
      const result = await tool.view("/test/large.txt");
      assertToolResultSuccess(result);
    });
  });

  describe("create", () => {
    it("should create new file", async () => {
      const result = await tool.create("/test/newfile.txt", "New content");
      assertToolResultSuccess(result, "Created");
      expect(mockFs.hasFile("/test/newfile.txt")).toBe(true);
    });

    it("should create file with multi-line content", async () => {
      const content = "Line 1\nLine 2\nLine 3";
      const result = await tool.create("/test/multiline.txt", content);
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/multiline.txt");
      expect(fileContent).toBe(content);
    });

    it("should create file with special characters", async () => {
      const content = "Special: \"quotes\", 'apostrophes', `backticks`";
      const result = await tool.create("/test/special.txt", content);
      assertToolResultSuccess(result);
    });

    it("should create empty file", async () => {
      const result = await tool.create("/test/empty.txt", "");
      assertToolResultSuccess(result);
      expect(mockFs.hasFile("/test/empty.txt")).toBe(true);
    });

    it("should create file in nested directory", async () => {
      const result = await tool.create("/test/nested/deep/file.txt", "content");
      assertToolResultSuccess(result);
      expect(mockFs.hasFile("/test/nested/deep/file.txt")).toBe(true);
    });

    it("should handle file creation cancellation", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
      });
      mockConfirmation.setNextConfirmation({ confirmed: false });
      const result = await tool.create("/test/newfile.txt", "content");
      assertToolResultFailure(result, "cancelled");
    });

    it("should handle file creation error", async () => {
      mockFs.setShouldFail(true);
      const result = await tool.create("/test/newfile.txt", "content");
      assertToolResultFailure(result);
    });

    it("should track edit history", async () => {
      await tool.create("/test/file1.txt", "content1");
      await tool.create("/test/file2.txt", "content2");
      const history = tool.getEditHistory();
      expect(history.length).toBe(2);
      expect(history[0].command).toBe("create");
      expect(history[1].command).toBe("create");
    });
  });

  describe("strReplace", () => {
    beforeEach(() => {
      mockFs.setFile(
        "/test/replace.txt",
        "old content line 1\nold content line 2",
      );
    });

    it("should replace single occurrence", async () => {
      const result = await tool.strReplace(
        "/test/replace.txt",
        "old content",
        "new content",
      );
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/replace.txt");
      expect(fileContent).toContain("new content");
    });

    it("should replace multiple occurrences", async () => {
      const result = await tool.strReplace(
        "/test/replace.txt",
        "old content",
        "new content",
        true,
      );
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/replace.txt");
      expect(fileContent?.split("new content").length - 1).toBe(2);
    });

    it("should handle multi-line replacement", async () => {
      const oldContent = "old content line 1\nold content line 2";
      const newContent = "new content line 1\nnew content line 2";
      const result = await tool.strReplace(
        "/test/replace.txt",
        oldContent,
        newContent,
      );
      assertToolResultSuccess(result);
    });

    it("should handle non-existent file", async () => {
      const result = await tool.strReplace("/nonexistent.txt", "old", "new");
      assertToolResultFailure(result, "File not found");
    });

    it("should handle string not found", async () => {
      const result = await tool.strReplace(
        "/test/replace.txt",
        "nonexistent",
        "new",
      );
      assertToolResultFailure(result, "String not found");
    });

    it("should handle empty old string", async () => {
      const result = await tool.strReplace("/test/replace.txt", "", "new");
      assertToolResultFailure(result);
    });

    it("should handle replacement cancellation", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
      });
      mockConfirmation.setNextConfirmation({ confirmed: false });
      const result = await tool.strReplace("/test/replace.txt", "old", "new");
      assertToolResultFailure(result, "cancelled");
    });

    it("should track replacement in edit history", async () => {
      await tool.strReplace("/test/replace.txt", "old", "new");
      const history = tool.getEditHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].command).toBe("str_replace");
    });
  });

  describe("replaceLines", () => {
    beforeEach(() => {
      mockFs.setFile(
        "/test/lines.txt",
        "line 1\nline 2\nline 3\nline 4\nline 5",
      );
    });

    it("should replace single line", async () => {
      const result = await tool.replaceLines(
        "/test/lines.txt",
        2,
        2,
        "new line 2",
      );
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/lines.txt");
      expect(fileContent).toContain("new line 2");
    });

    it("should replace multiple lines", async () => {
      const result = await tool.replaceLines(
        "/test/lines.txt",
        2,
        4,
        "new content",
      );
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/lines.txt");
      expect(fileContent).toContain("new content");
    });

    it("should handle invalid start line", async () => {
      const result = await tool.replaceLines("/test/lines.txt", 0, 2, "new");
      assertToolResultFailure(result, "Invalid start line");
    });

    it("should handle start line beyond file length", async () => {
      const result = await tool.replaceLines(
        "/test/lines.txt",
        100,
        102,
        "new",
      );
      assertToolResultFailure(result, "Invalid start line");
    });

    it("should handle end line before start line", async () => {
      const result = await tool.replaceLines("/test/lines.txt", 4, 2, "new");
      assertToolResultFailure(result, "Invalid end line");
    });

    it("should handle end line beyond file length", async () => {
      const result = await tool.replaceLines("/test/lines.txt", 2, 100, "new");
      assertToolResultFailure(result, "Invalid end line");
    });
  });

  describe("insert", () => {
    beforeEach(() => {
      mockFs.setFile("/test/insert.txt", "line 1\nline 3\nline 4");
    });

    it("should insert line at beginning", async () => {
      const result = await tool.insert("/test/insert.txt", 1, "new line");
      assertToolResultSuccess(result, "line 1");
      const fileContent = mockFs.getFile("/test/insert.txt");
      expect(fileContent?.split("\n")[0]).toBe("new line");
    });

    it("should insert line in middle", async () => {
      const result = await tool.insert("/test/insert.txt", 2, "line 2");
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/insert.txt");
      expect(fileContent?.split("\n")[1]).toBe("line 2");
    });

    it("should insert line at end", async () => {
      const result = await tool.insert("/test/insert.txt", 4, "line 5");
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/insert.txt");
      expect(fileContent?.split("\n").pop()).toBe("line 5");
    });

    it("should handle non-existent file", async () => {
      const result = await tool.insert("/nonexistent.txt", 1, "new line");
      assertToolResultFailure(result, "File not found");
    });

    it("should track insert in edit history", async () => {
      await tool.insert("/test/insert.txt", 2, "new line");
      const history = tool.getEditHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].command).toBe("insert");
    });
  });

  describe("undoEdit", () => {
    it("should undo last create operation", async () => {
      await tool.create("/test/to-undo.txt", "content");
      expect(mockFs.hasFile("/test/to-undo.txt")).toBe(true);
      const result = await tool.undoEdit();
      assertToolResultSuccess(result, "undid create");
      expect(mockFs.hasFile("/test/to-undo.txt")).toBe(false);
    });

    it("should undo last insert operation", async () => {
      mockFs.setFile("/test/insert.txt", "line 1\nline 3");
      await tool.insert("/test/insert.txt", 2, "line 2");
      await tool.undoEdit();
      const fileContent = mockFs.getFile("/test/insert.txt");
      expect(fileContent).toBe("line 1\nline 3");
    });

    it("should handle empty edit history", async () => {
      const result = await tool.undoEdit();
      assertToolResultFailure(result, "No edits to undo");
    });

    it("should undo multiple edits in reverse order", async () => {
      await tool.create("/test/file1.txt", "content1");
      await tool.create("/test/file2.txt", "content2");
      await tool.undoEdit();
      expect(mockFs.hasFile("/test/file2.txt")).toBe(false);
      expect(mockFs.hasFile("/test/file1.txt")).toBe(true);
    });
  });

  describe("getEditHistory", () => {
    it("should return empty history initially", () => {
      const history = tool.getEditHistory();
      expect(history).toEqual([]);
    });

    it("should return all edit operations", async () => {
      await tool.create("/test/file1.txt", "content1");
      mockFs.setFile("/test/file2.txt", "old");
      await tool.strReplace("/test/file2.txt", "old", "new");
      const history = tool.getEditHistory();
      expect(history.length).toBe(2);
      expect(history[0].command).toBe("create");
      expect(history[1].command).toBe("str_replace");
    });

    it("should return copy of history", async () => {
      await tool.create("/test/file.txt", "content");
      const history1 = tool.getEditHistory();
      const history2 = tool.getEditHistory();
      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("edge cases", () => {
    it("should handle very long content in create", async () => {
      const longContent = "x".repeat(100000);
      const result = await tool.create("/test/long.txt", longContent);
      assertToolResultSuccess(result);
    });

    it("should handle unicode content", async () => {
      const unicodeContent = "你好世界 🎉 日本語";
      const result = await tool.create("/test/unicode.txt", unicodeContent);
      assertToolResultSuccess(result);
      const fileContent = mockFs.getFile("/test/unicode.txt");
      expect(fileContent).toBe(unicodeContent);
    });

    it("should handle file path with special characters", async () => {
      const result = await tool.create("/test/special@file.txt", "content");
      assertToolResultSuccess(result);
    });

    it("should handle empty string as old string in strReplace", async () => {
      mockFs.setFile("/test/test.txt", "content");
      const result = await tool.strReplace("/test/test.txt", "", "new");
      assertToolResultFailure(result);
    });

    it("should handle very old string in strReplace", async () => {
      const oldString = "a".repeat(10000);
      mockFs.setFile("/test/test.txt", oldString);
      const result = await tool.strReplace("/test/test.txt", oldString, "new");
      assertToolResultSuccess(result);
    });
  });
});
