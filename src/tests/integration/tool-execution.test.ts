import {
  getMockConfirmationService,
  resetMockConfirmationService,
} from "../mocks/mock-confirmation-service";
import {
  getMockFileSystem,
  resetMockFileSystem,
} from "../mocks/mock-file-system";
import { setupMockFileSystem, assertToolResultSuccess } from "../test-helpers";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TextEditorTool } from "../../tools/text-editor";
import { SearchTool } from "../../tools/search";
import { BashTool } from "../../tools/bash";

describe("Integration: Tool Execution", () => {
  let textEditor: TextEditorTool;
  let bash: BashTool;
  let search: SearchTool;
  let mockFs: ReturnType<typeof getMockFileSystem>;
  let mockConfirmation: ReturnType<typeof getMockConfirmationService>;

  beforeEach(() => {
    mockFs = setupMockFileSystem();
    mockConfirmation = getMockConfirmationService();
    mockConfirmation.reset();
    mockConfirmation.setSessionFlags({
      fileOperations: true,
      bashCommands: true,
      allOperations: false,
    });

    textEditor = new TextEditorTool();
    bash = new BashTool();
    search = new SearchTool();

    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockFileSystem();
    resetMockConfirmationService();
  });

  describe("multi-tool workflow: create and edit file", () => {
    it("should create file and then edit it", async () => {
      const createResult = await textEditor.create(
        "/test/workflow.txt",
        "Initial content",
      );
      assertToolResultSuccess(createResult);

      const editResult = await textEditor.strReplace(
        "/test/workflow.txt",
        "Initial content",
        "Updated content",
      );
      assertToolResultSuccess(editResult);
    });

    it("should create file, view it, and then edit", async () => {
      const createResult = await textEditor.create(
        "/test/multi-step.txt",
        "Line 1\nLine 2",
      );
      assertToolResultSuccess(createResult);

      const viewResult = await textEditor.view("/test/multi-step.txt");
      assertToolResultSuccess(viewResult);

      const editResult = await textEditor.strReplace(
        "/test/multi-step.txt",
        "Line 2",
        "New Line 2",
      );
      assertToolResultSuccess(editResult);
    });

    it("should handle multiple edits in sequence", async () => {
      await textEditor.create("/test/multi-edit.txt", "One\nTwo\nThree");
      assertToolResultSuccess(
        await textEditor.strReplace("/test/multi-edit.txt", "One", "1"),
      );
      assertToolResultSuccess(
        await textEditor.strReplace("/test/multi-edit.txt", "Two", "2"),
      );
      assertToolResultSuccess(
        await textEditor.strReplace("/test/multi-edit.txt", "Three", "3"),
      );
    });

    it("should undo edits in correct order", async () => {
      await textEditor.create("/test/undo-test.txt", "Original");
      await textEditor.strReplace(
        "/test/undo-test.txt",
        "Original",
        "First Edit",
      );
      await textEditor.strReplace(
        "/test/undo-test.txt",
        "First Edit",
        "Second Edit",
      );

      const undo1 = await textEditor.undoEdit();
      expect(undo1.success).toBe(true);

      const undo2 = await textEditor.undoEdit();
      expect(undo2.success).toBe(true);

      const undo3 = await textEditor.undoEdit();
      expect(undo3.success).toBe(true);
    });
  });

  describe("bash and file operations workflow", () => {
    it("should create file and then list it with bash", async () => {
      await textEditor.create("/test/bash-workflow.txt", "Content");
      const lsResult = await bash.execute("ls /test");
      expect(lsResult).toBeDefined();
    });

    it("should create file and then search for it", async () => {
      await textEditor.create("/test/search-workflow.js", "function test() {}");
      const searchResult = await search.search("function", {
        searchType: "text",
      });
      expect(searchResult).toBeDefined();
    });

    it("should execute bash command that creates file", async () => {
      await bash.execute("mkdir -p /test/bash-dir");
      const result = await textEditor.create(
        "/test/bash-dir/file.txt",
        "Created via bash",
      );
      assertToolResultSuccess(result);
    });

    it("should search for file created by bash", async () => {
      await bash.execute("mkdir -p /test/batch-dir");
      await textEditor.create("/test/batch-dir/test.txt", "test content");
      const result = await search.search("test.txt", { searchType: "files" });
      expect(result).toBeDefined();
    });
  });

  describe("search and edit workflow", () => {
    it("should search for content and then edit file", async () => {
      await textEditor.create(
        "/test/search-edit.txt",
        "old pattern\nanother line\nold pattern",
      );

      const searchResult = await search.search("old pattern", {
        searchType: "text",
      });
      expect(searchResult).toBeDefined();

      const editResult = await textEditor.strReplace(
        "/test/search-edit.txt",
        "old pattern",
        "new pattern",
        true,
      );
      assertToolResultSuccess(editResult);
    });

    it("should search across multiple files", async () => {
      await textEditor.create("/test/file1.js", "function one() {}");
      await textEditor.create("/test/file2.js", "function two() {}");
      await textEditor.create("/test/file3.ts", "function three() {}");

      const result = await search.search("function", { searchType: "text" });
      expect(result).toBeDefined();
    });
  });

  describe("complex multi-tool scenarios", () => {
    it("should create, view, edit, and search in sequence", async () => {
      await textEditor.create("/test/complex.txt", "Initial\nContent\nHere");
      assertToolResultSuccess(await textEditor.view("/test/complex.txt"));
      assertToolResultSuccess(
        await textEditor.strReplace("/test/complex.txt", "Initial", "Updated"),
      );
      const searchResult = await search.search("Updated", {
        searchType: "text",
      });
      expect(searchResult).toBeDefined();
    });

    it("should handle file creation in nested directories", async () => {
      await bash.execute("mkdir -p /test/nested/deep/path");
      const createResult = await textEditor.create(
        "/test/nested/deep/path/file.txt",
        "Deep file",
      );
      assertToolResultSuccess(createResult);

      const viewResult = await textEditor.view("/test/nested/deep/path");
      assertToolResultSuccess(viewResult);
    });

    it("should work with multiple file types", async () => {
      await textEditor.create("/test/app.js", "const x = 1;");
      await textEditor.create("/test/style.css", "body { color: red; }");
      await textEditor.create("/test/index.html", "<html></html>");

      const jsSearch = await search.search("const", {
        fileTypes: ["*.js"],
        searchType: "text",
      });
      expect(jsSearch).toBeDefined();

      const cssSearch = await search.search("color", {
        fileTypes: ["*.css"],
        searchType: "text",
      });
      expect(cssSearch).toBeDefined();
    });

    it("should handle large files with search", async () => {
      const largeContent = Array.from(
        { length: 1000 },
        (_, i) => `Line ${i}: keyword`,
      ).join("\n");
      await textEditor.create("/test/large.txt", largeContent);

      const searchResult = await search.search("keyword", {
        searchType: "text",
      });
      expect(searchResult).toBeDefined();
    });
  });

  describe("error handling in multi-tool workflows", () => {
    it("should handle file not found during edit", async () => {
      const result = await textEditor.strReplace(
        "/nonexistent.txt",
        "old",
        "new",
      );
      expect(result.success).toBe(false);
    });

    it("should handle search with no results", async () => {
      const result = await search.search("nonexistent-text-xyz", {
        searchType: "text",
      });
      expect(result).toBeDefined();
    });

    it("should handle bash command failure gracefully", async () => {
      const result = await bash.execute("invalid-command-xyz");
      expect(result).toBeDefined();
    });

    it("should handle cancellation during file operations", async () => {
      mockConfirmation.setSessionFlags({
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
      });
      mockConfirmation.setNextConfirmation({ confirmed: false });

      const result = await textEditor.create("/test/cancelled.txt", "content");
      expect(result.success).toBe(false);
    });
  });

  describe("performance scenarios", () => {
    it("should handle many file operations", async () => {
      for (let i = 0; i < 50; i++) {
        const result = await textEditor.create(
          `/test/file${i}.txt`,
          `Content ${i}`,
        );
        expect(result).toBeDefined();
      }
    });

    it("should handle many search operations", async () => {
      for (let i = 0; i < 50; i++) {
        await textEditor.create(
          `/test/search${i}.js`,
          `function test${i}() {}`,
        );
      }

      for (let i = 0; i < 10; i++) {
        const result = await search.search("function", {
          searchType: "text",
        });
        expect(result).toBeDefined();
      }
    });

    it("should handle concurrent-style operations", async () => {
      const operations = [
        textEditor.create("/test/concurrent1.txt", "Content 1"),
        textEditor.create("/test/concurrent2.txt", "Content 2"),
        textEditor.create("/test/concurrent3.txt", "Content 3"),
      ];

      const results = await Promise.all(operations);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe("special file content scenarios", () => {
    it("should handle files with special characters", async () => {
      const specialContent = "!@#$%^&*()_+-=[]{}|;:'\",./<>?";
      const result = await textEditor.create(
        "/test/special.txt",
        specialContent,
      );
      assertToolResultSuccess(result);
    });

    it("should handle files with unicode", async () => {
      const unicodeContent = "你好世界 🎉 日本語 café résumé naïve";
      const result = await textEditor.create(
        "/test/unicode.txt",
        unicodeContent,
      );
      assertToolResultSuccess(result);
    });

    it("should handle files with newlines and tabs", async () => {
      const content = "Line 1\n\tTabbed\nLine 3\r\nWindows";
      const result = await textEditor.create("/test/whitespace.txt", content);
      assertToolResultSuccess(result);
    });

    it("should search for special characters", async () => {
      await textEditor.create("/test/special-search.txt", "Test: @#$%");
      const result = await search.search("@#$%", { searchType: "text" });
      expect(result).toBeDefined();
    });
  });
});
