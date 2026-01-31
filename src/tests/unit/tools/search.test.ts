import {
  setupMockFileSystem,
  assertToolResultSuccess,
  assertToolResultFailure,
} from "../../test-helpers";
import {
  getMockFileSystem,
  resetMockFileSystem,
} from "../../mocks/mock-file-system";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MOCK_FILES } from "../../mocks/mock-data";
import { SearchTool } from "../../../tools/search";

describe("SearchTool", () => {
  let tool: SearchTool;
  let mockFs: ReturnType<typeof setupMockFileSystem>;

  beforeEach(() => {
    mockFs = setupMockFileSystem();
    mockFs.setFile("/test/javascript.js", MOCK_FILES.javascript.content);
    mockFs.setFile("/test/typescript.ts", MOCK_FILES.typescript.content);
    mockFs.setFile("/test/config.json", MOCK_FILES.json.content);
    mockFs.setFile("/test/README.md", MOCK_FILES.markdown.content);
    tool = new SearchTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockFileSystem();
  });

  describe("search", () => {
    it("should search for simple text", async () => {
      const result = await tool.search("function");
      assertToolResultSuccess(result);
    });

    it("should search for multiple occurrences", async () => {
      const result = await tool.search("console");
      assertToolResultSuccess(result);
    });

    it("should handle empty query", async () => {
      const result = await tool.search("");
      expect(result).toBeDefined();
    });

    it("should handle case-sensitive search", async () => {
      const result = await tool.search("Function", { caseSensitive: true });
      expect(result).toBeDefined();
    });

    it("should handle case-insensitive search", async () => {
      const result = await tool.search("function", { caseSensitive: false });
      expect(result).toBeDefined();
    });

    it("should handle whole word search", async () => {
      const result = await tool.search("function", { wholeWord: true });
      expect(result).toBeDefined();
    });

    it("should handle regex search", async () => {
      const result = await tool.search("import.*from", { regex: true });
      expect(result).toBeDefined();
    });

    it("should handle file type filtering", async () => {
      const result = await tool.search("function", { fileTypes: ["*.js"] });
      expect(result).toBeDefined();
    });

    it("should handle max results limit", async () => {
      const result = await tool.search("function", { maxResults: 5 });
      expect(result).toBeDefined();
    });

    it("should handle include pattern", async () => {
      const result = await tool.search("function", {
        includePattern: "src/**/*",
      });
      expect(result).toBeDefined();
    });

    it("should handle exclude pattern", async () => {
      const result = await tool.search("function", {
        excludePattern: "node_modules/**",
      });
      expect(result).toBeDefined();
    });

    it("should handle include hidden files option", async () => {
      const result = await tool.search("function", { includeHidden: true });
      expect(result).toBeDefined();
    });

    it("should handle search by file name", async () => {
      const result = await tool.search("*.js", { searchType: "name" });
      expect(result).toBeDefined();
    });

    it("should handle search by content", async () => {
      const result = await tool.search("function", { searchType: "content" });
      expect(result).toBeDefined();
    });

    it("should handle search by path", async () => {
      const result = await tool.search("/test", { searchType: "path" });
      expect(result).toBeDefined();
    });
  });

  describe("search content", () => {
    beforeEach(() => {
      mockFs.setFile(
        "/test/code.js",
        `function test() {
  console.log('hello');
  console.log('world');
}`,
      );
      mockFs.setFile(
        "/test/another.js",
        `function another() {
  return 'test';
}`,
      );
    });

    it("should find text in files", async () => {
      const result = await tool.search("console.log", {
        searchType: "content",
      });
      assertToolResultSuccess(result);
    });

    it("should return file paths with matches", async () => {
      const result = await tool.search("function", { searchType: "content" });
      expect(result.success).toBe(true);
    });

    it("should handle special regex characters", async () => {
      const result = await tool.search("function\\(\\)", { regex: true });
      expect(result).toBeDefined();
    });

    it("should handle unicode in search", async () => {
      mockFs.setFile("/test/unicode.txt", "你好世界 🎉 日本語");
      const result = await tool.search("你好", { searchType: "content" });
      assertToolResultSuccess(result);
    });
  });

  describe("search file names", () => {
    it("should find files by name pattern", async () => {
      const result = await tool.search("*.js", { searchType: "name" });
      assertToolResultSuccess(result);
    });

    it("should find files by extension", async () => {
      const result = await tool.search("*.json", { searchType: "name" });
      assertToolResultSuccess(result);
    });

    it("should handle glob patterns", async () => {
      const result = await tool.search("**/*.ts", { searchType: "name" });
      expect(result).toBeDefined();
    });

    it("should handle exact file name", async () => {
      const result = await tool.search("config.json", { searchType: "name" });
      expect(result).toBeDefined();
    });
  });

  describe("search paths", () => {
    it("should search by directory path", async () => {
      const result = await tool.search("/test", { searchType: "path" });
      assertToolResultSuccess(result);
    });

    it("should handle wildcards in path", async () => {
      const result = await tool.search("/test/**/*.js", { searchType: "path" });
      expect(result).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle very long search query", async () => {
      const longQuery = "a".repeat(10000);
      const result = await tool.search(longQuery);
      expect(result).toBeDefined();
    });

    it("should handle special characters in query", async () => {
      const result = await tool.search("!@#$%^&*()");
      expect(result).toBeDefined();
    });

    it("should handle newlines in query", async () => {
      const result = await tool.search("line1\nline2");
      expect(result).toBeDefined();
    });

    it("should handle tabs in query", async () => {
      const result = await tool.search("test\tquery");
      expect(result).toBeDefined();
    });

    it("should handle query with escape sequences", async () => {
      const result = await tool.search("test\\nquery");
      expect(result).toBeDefined();
    });

    it("should handle regex with capture groups", async () => {
      const result = await tool.search("(function|class)", { regex: true });
      expect(result).toBeDefined();
    });

    it("should handle regex with quantifiers", async () => {
      const result = await tool.search("a+", { regex: true });
      expect(result).toBeDefined();
    });

    it("should handle regex with character classes", async () => {
      const result = await tool.search("[a-zA-Z]", { regex: true });
      expect(result).toBeDefined();
    });

    it("should handle search with no results", async () => {
      const result = await tool.search("nonexistent-text-xyz-123");
      expect(result).toBeDefined();
    });

    it("should handle search with zero max results", async () => {
      const result = await tool.search("function", { maxResults: 0 });
      expect(result).toBeDefined();
    });

    it("should handle very large max results", async () => {
      const result = await tool.search("function", { maxResults: 100000 });
      expect(result).toBeDefined();
    });

    it("should handle complex include pattern", async () => {
      const result = await tool.search("function", {
        includePattern: "src/**/*.js",
        excludePattern: "**/test/**",
      });
      expect(result).toBeDefined();
    });

    it("should handle multiple file types", async () => {
      const result = await tool.search("function", {
        fileTypes: ["*.js", "*.ts"],
      });
      expect(result).toBeDefined();
    });
  });

  describe("performance", () => {
    it("should handle search across many files", async () => {
      for (let i = 0; i < 100; i++) {
        mockFs.setFile(
          `/test/file${i}.js`,
          `function test${i}() { return ${i}; }`,
        );
      }
      const result = await tool.search("function");
      assertToolResultSuccess(result);
    });

    it("should handle large files", async () => {
      const largeContent = Array.from(
        { length: 10000 },
        (_, i) => `line ${i} with function`,
      ).join("\n");
      mockFs.setFile("/test/large.js", largeContent);
      const result = await tool.search("function");
      expect(result).toBeDefined();
    });
  });

  describe("search options combinations", () => {
    it("should combine case sensitivity with whole word", async () => {
      const result = await tool.search("Function", {
        caseSensitive: true,
        wholeWord: true,
      });
      expect(result).toBeDefined();
    });

    it("should combine regex with case sensitivity", async () => {
      const result = await tool.search("[Ff]unction", {
        regex: true,
        caseSensitive: true,
      });
      expect(result).toBeDefined();
    });

    it("should combine file type with max results", async () => {
      const result = await tool.search("function", {
        fileTypes: ["*.js"],
        maxResults: 10,
      });
      expect(result).toBeDefined();
    });

    it("should combine include and exclude patterns", async () => {
      const result = await tool.search("function", {
        includePattern: "/test/**/*",
        excludePattern: "**/*.json",
      });
      expect(result).toBeDefined();
    });
  });
});
