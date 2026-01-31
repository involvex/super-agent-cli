export const MOCK_CHAT_ENTRIES = [
  {
    type: "user",
    content: "Hello, how are you?",
    timestamp: new Date("2024-01-01T10:00:00Z"),
  },
  {
    type: "assistant",
    content: "I'm doing well, thank you!",
    timestamp: new Date("2024-01-01T10:00:01Z"),
  },
  {
    type: "user",
    content: "Can you help me with a task?",
    timestamp: new Date("2024-01-01T10:00:02Z"),
  },
];

export const MOCK_TOOL_RESULTS = {
  success: {
    success: true,
    output: "Operation completed successfully",
  },
  failure: {
    success: false,
    error: "Operation failed",
  },
  fileNotFound: {
    success: false,
    error: "File not found: /nonexistent/file.txt",
  },
  permissionDenied: {
    success: false,
    error: "Permission denied",
  },
};

export const MOCK_LLM_MESSAGES = {
  system: {
    role: "system",
    content: "You are a helpful assistant",
  },
  user: {
    role: "user",
    content: "Hello",
  },
  assistant: {
    role: "assistant",
    content: "Hi there!",
  },
  tool: {
    role: "tool",
    content: "Tool executed successfully",
    tool_call_id: "call_123",
  },
};

export const MOCK_FILES = {
  simpleText: {
    path: "/test/simple.txt",
    content: "Hello, World!\nThis is a test file.\nIt has multiple lines.",
  },
  javascript: {
    path: "/test/script.js",
    content: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,
  },
  typescript: {
    path: "/test/app.ts",
    content: `interface User {
  name: string;
  age: number;
}

const user: User = { name: "Alice", age: 30 };

export { user };`,
  },
  json: {
    path: "/test/config.json",
    content: JSON.stringify(
      {
        name: "test",
        version: "1.0.0",
        dependencies: {
          lodash: "^4.17.21",
        },
      },
      null,
      2,
    ),
  },
  markdown: {
    path: "/test/README.md",
    content: `# Test Project

## Introduction
This is a test project for unit testing.

## Features
- Feature 1
- Feature 2
- Feature 3
`,
  },
  largeFile: {
    path: "/test/large.txt",
    content: Array.from(
      { length: 100 },
      (_, i) => `Line ${i + 1}: Some content`,
    ).join("\n"),
  },
  emptyFile: {
    path: "/test/empty.txt",
    content: "",
  },
  specialCharacters: {
    path: "/test/special.txt",
    content:
      "Special chars: \"quotes\", 'apostrophes', `backticks`, $variables, @mentions, #hashtags",
  },
};

export const MOCK_BASH_COMMANDS = {
  ls: "ls -la",
  pwd: "pwd",
  echo: "echo 'Hello'",
  grep: "grep 'pattern' file.txt",
  find: "find . -name '*.js'",
  npm: "npm install",
  git: "git status",
};

export const MOCK_SEARCH_QUERIES = {
  simple: "function",
  regex: "import.*from",
  caseSensitive: "Hello",
  wholeWord: "test",
  filePattern: "*.ts",
  excludePattern: "node_modules",
};

export const EDGE_CASES = {
  emptyStrings: ["", "   ", "\t\t", "\n\n"],
  largeStrings: ["a".repeat(10000), "b".repeat(50000)],
  specialCharacters: [
    '"quotes"',
    "'apostrophes'",
    "`backticks`",
    "$var",
    "@user",
    "#tag",
  ],
  unicode: ["你好", "🎉", " café ", "日本語"],
  whitespace: ["  leading", "trailing  ", "  both  ", "multiple   spaces"],
  newlines: ["line1\nline2", "line1\r\nline2\rline3", "\n\nempty lines\n\n"],
  tabs: ["tab\there", "\t\tindented\t"],
  nullUndefined: [null, undefined],
  numbers: [0, -1, 1, 100, 1000000, Number.MAX_SAFE_INTEGER],
  booleans: [true, false],
  arrays: [[], [1, 2, 3], [null, undefined]],
  objects: [{}, { key: "value" }, { nested: { deeper: {} } }],
};

export const MOCK_SETTINGS = {
  user: {
    active_provider: "grok",
    providers: {
      grok: {
        id: "grok",
        provider: "grok",
        model: "grok-code-fast-1",
        api_key: "test-api-key",
        base_url: "https://api.test.com/v1",
        default_model: "grok-code-fast-1",
      },
    },
    ui: {
      theme: "dark",
      showModelInfoInChat: true,
    },
    settingsVersion: 2,
  },
  project: {
    active_provider: "openai",
    ui: {
      theme: "light",
    },
  },
};

export const MOCK_TOOL_CALLS = {
  viewFile: {
    id: "call_view_123",
    type: "function" as const,
    function: {
      name: "view_file",
      arguments: JSON.stringify({ path: "/test/file.txt" }),
    },
  },
  createFile: {
    id: "call_create_456",
    type: "function" as const,
    function: {
      name: "create_file",
      arguments: JSON.stringify({
        path: "/test/newfile.txt",
        content: "New file content",
      }),
    },
  },
  strReplace: {
    id: "call_replace_789",
    type: "function" as const,
    function: {
      name: "str_replace_editor",
      arguments: JSON.stringify({
        path: "/test/file.txt",
        old_str: "old content",
        new_str: "new content",
      }),
    },
  },
  bash: {
    id: "call_bash_000",
    type: "function" as const,
    function: {
      name: "bash",
      arguments: JSON.stringify({ command: "ls -la" }),
    },
  },
  search: {
    id: "call_search_111",
    type: "function" as const,
    function: {
      name: "search",
      arguments: JSON.stringify({ query: "function", search_type: "content" }),
    },
  },
};

export const INVALID_INPUTS = {
  empty: "",
  whitespaceOnly: "   ",
  null: null as any,
  undefined: undefined as any,
  invalidPath: "/nonexistent/path/that/does/not/exist.txt",
  invalidCommand: "this-is-not-a-valid-command-xyz123",
  malformedJSON: "{ invalid json }",
  hugeNumber: Number.MAX_SAFE_INTEGER + 1,
  negativeNumber: -1000000,
};
