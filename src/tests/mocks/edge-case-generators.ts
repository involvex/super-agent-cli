export function generateLongStrings(lengths: number[]): string[] {
  return lengths.map(len => "a".repeat(len));
}

export function generateSpecialCharacters(): string[] {
  return [
    '"quotes"',
    "'apostrophes'",
    "`backticks`",
    "$variables",
    "@mentions",
    "#hashtags",
    "%percent",
    "^caret",
    "&ampersand",
    "*asterisk",
    "(parentheses)",
    "[brackets]",
    "{braces}",
    "<angles>",
    "plus+",
    "minus-",
    "equals=",
    "question?",
    "exclamation!",
    "slash/",
    "backslash\\",
    "pipe|",
    "tilde~",
    "grave`",
  ];
}

export function generateUnicodeStrings(): string[] {
  return [
    "你好世界",
    "🎉🎊🎈",
    "café résumé naïve",
    "日本語のテキスト",
    "Ελληνικά",
    "العربية",
    "עברית",
    "한글",
    "ไทย",
    "עברית",
    "🚀🌟⭐",
    "©®™€£¥",
  ];
}

export function generateWhitespaceVariations(base: string): string[] {
  return [
    base,
    `  ${base}`,
    `${base}  `,
    `  ${base}  `,
    `\t${base}`,
    `${base}\t`,
    `\n${base}`,
    `${base}\n`,
    `\r\n${base}`,
    `${base}\r\n`,
    `  \t  ${base}  \n  `,
  ];
}

export function generateNewlineVariations(content: string): string[] {
  return [
    content.replace(/\n/g, "\n"),
    content.replace(/\n/g, "\r\n"),
    content.replace(/\n/g, "\r"),
    content.replace(/\n/g, "\n\n"),
    content.replace(/\n/g, "\r\n\r\n"),
    `${content}\n`,
    `${content}\r\n`,
    `${content}\n\n`,
    `\n${content}\n`,
  ];
}

export function generateDeeplyNestedObjects(depth: number): any {
  let result: any = { value: "leaf" };
  for (let i = 0; i < depth; i++) {
    result = { nested: result };
  }
  return result;
}

export function generateLargeArray(size: number): any[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    value: `item-${i}`,
  }));
}

export function generateMixedTypeArrays(): any[][] {
  return [
    [],
    [1, 2, 3],
    ["a", "b", "c"],
    [true, false, true],
    [null, undefined],
    [1, "two", true, null, undefined, {}],
    [
      [1, 2],
      [3, 4],
    ],
    [{ key: "value" }, { another: "value" }],
  ];
}

export function generateBoundaryNumbers(): number[] {
  return [
    Number.MIN_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER + 1,
    -1000000,
    -1000,
    -100,
    -10,
    -1,
    0,
    1,
    10,
    100,
    1000,
    1000000,
    Number.MAX_SAFE_INTEGER - 1,
    Number.MAX_SAFE_INTEGER,
  ];
}

export function generateEdgeCaseFilePaths(): string[] {
  return [
    "/",
    "/.",
    "/..",
    "/file.txt",
    "/path/to/file.txt",
    "/very/deep/nested/path/to/file.txt",
    "/path/with spaces/file.txt",
    "/path/with-dashes/file.txt",
    "/path/with_underscores/file.txt",
    "/path/with.multiple.dots/file.txt",
    "/path/with/special@chars/file.txt",
    "/path/unicode/日本語/file.txt",
    "./relative/path.txt",
    "../parent/path.txt",
    "~/home/path.txt",
    "C:\\Windows\\path.txt",
    "\\\\network\\path\\file.txt",
    "/",
    "/dev/null",
    "/proc/cpuinfo",
    "/tmp/file.txt",
  ];
}

export function generateInvalidJSON(): string[] {
  return [
    "{",
    "}",
    "[",
    "]",
    "{ invalid }",
    "[ invalid ]",
    "{ 'key': 'value' }",
    "{ key: value }",
    "undefined",
    "null",
    "NaN",
    "Infinity",
    "function(){}",
    "class Test {}",
    "const x = 1",
    '"just a string"',
    "12345",
    "true",
    "false",
  ];
}

export function generateMalformedToolCalls(): any[] {
  return [
    { id: "", type: "function", function: { name: "", arguments: "{}" } },
    {
      id: "test",
      type: "invalid",
      function: { name: "test", arguments: "{}" },
    },
    {
      id: "test",
      type: "function",
      function: { name: "test", arguments: "invalid json" },
    },
    {
      id: "test",
      type: "function",
      function: { name: "unknown_tool", arguments: "{}" },
    },
    {
      id: "test",
      type: "function",
      function: { name: "bash", arguments: "no args object" },
    },
    { type: "function", function: { name: "test", arguments: "{}" } },
    { id: "test", type: "function" },
    { id: "test" },
    {},
    null,
    undefined,
    "string",
    123,
    [],
  ];
}

export function generateConcurrentOperations(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

export function generateRandomStrings(count: number, length: number): string[] {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: count }, () => {
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  });
}

export function generateStressTestData(): {
  largeFiles: { path: string; content: string }[];
  largeArrays: any[];
  deepObjects: any[];
  longStrings: string[];
} {
  return {
    largeFiles: [
      {
        path: "/large-file-1.txt",
        content: "x".repeat(100000),
      },
      {
        path: "/large-file-2.txt",
        content: Array.from({ length: 10000 }, (_, i) => `Line ${i}\n`).join(
          "",
        ),
      },
    ],
    largeArrays: [generateLargeArray(10000), generateLargeArray(100000)],
    deepObjects: [
      generateDeeplyNestedObjects(10),
      generateDeeplyNestedObjects(100),
      generateDeeplyNestedObjects(1000),
    ],
    longStrings: generateLongStrings([100, 1000, 10000, 100000]),
  };
}

export function generateErrorScenarios(): Array<{
  name: string;
  error: Error;
}> {
  return [
    { name: "generic error", error: new Error("Generic error") },
    { name: "type error", error: new TypeError("Type error") },
    { name: "range error", error: new RangeError("Range error") },
    { name: "reference error", error: new ReferenceError("Reference error") },
    { name: "syntax error", error: new SyntaxError("Syntax error") },
    { name: "custom error", error: new Error("Custom error message") },
    { name: "error with stack", error: new Error("Error with stack trace") },
  ];
}

export function generateNetworkErrorScenarios(): Array<{
  name: string;
  error: Error;
}> {
  return [
    { name: "network timeout", error: new Error("Network timeout") },
    { name: "connection refused", error: new Error("ECONNREFUSED") },
    { name: "connection reset", error: new Error("ECONNRESET") },
    { name: "host not found", error: new Error("ENOTFOUND") },
    {
      name: "service unavailable",
      error: new Error("503 Service Unavailable"),
    },
    { name: "rate limit exceeded", error: new Error("429 Too Many Requests") },
    { name: "unauthorized", error: new Error("401 Unauthorized") },
    { name: "forbidden", error: new Error("403 Forbidden") },
  ];
}
