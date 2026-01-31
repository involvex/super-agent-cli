# Testing Infrastructure

This document describes the comprehensive testing infrastructure for the Super Agent CLI project.

## Test Framework

We use **Vitest** as our test framework, which provides:

- Fast test execution
- Native TypeScript support
- ES module support
- Watch mode
- Built-in code coverage with v8

## Installation

Test dependencies are already installed:

- `vitest` - Test framework
- `@vitest/coverage-v8` - Code coverage provider

## Running Tests

### Run all tests

```bash
bun run test
```

### Run tests in watch mode

```bash
bun run test:watch
```

### Run tests with coverage

```bash
bun run test:coverage
```

### Run only unit tests

```bash
bun run test:unit
```

### Run only integration tests

```bash
bun run test:integration
```

## Test Structure

```
src/tests/
├── unit/                    # Unit tests for individual components
│   ├── agent/              # Super agent tests
│   ├── tools/              # Tool implementations
│   ├── core/               # Core components (LLM providers, etc.)
│   ├── utils/              # Utility functions
│   ├── mcp/               # MCP client tests
│   ├── plugins/            # Plugin manager tests
│   └── skills/             # Skills manager tests
├── integration/            # Integration tests
│   ├── agent-workflows.test.ts
│   ├── tool-execution.test.ts
│   └── configuration.test.ts
├── mocks/                 # Test mocks and factories
│   ├── mock-data-factories.ts
│   ├── mock-llm-provider.ts
│   ├── mock-settings-manager.ts
│   ├── mock-file-system.ts
│   ├── mock-confirmation-service.ts
│   ├── mock-data.ts
│   └── edge-case-generators.ts
└── test-helpers.ts        # Helper functions
```

## Test Mocks

### Mock Data Factories (`mock-data-factories.ts`)

Functions to create mock data for testing:

- `createMockChatEntry()` - Create chat entry data
- `createMockToolResult()` - Create tool result data
- `createMockLLMMessage()` - Create LLM message data
- `createMockLLMToolCall()` - Create tool call data
- `createMockLLMResponse()` - Create LLM response data
- `createMockAgentState()` - Create agent state data

### Mock Implementations

#### MockLLMProvider (`mock-llm-provider.ts`)

Mock LLM provider with full control over responses:

- Set custom responses
- Queue multiple responses
- Control success/failure
- Mock streaming responses
- List models

#### MockSettingsManager (`mock-settings-manager.ts`)

Mock settings manager with:

- User and project settings
- Provider configurations
- Model management
- Settings persistence

#### MockFileSystem (`mock-file-system.ts`)

In-memory file system for testing:

- Create, read, write files
- Create directories
- Path operations
- Error simulation

#### MockConfirmationService (`mock-confirmation-service.ts`)

Mock confirmation service for:

- Confirmation flow control
- Session flags
- User approve/reject simulation

### Pre-defined Test Data (`mock-data.ts`)

Collections of common test data:

- Mock chat entries
- Mock tool results
- Mock LLM messages
- Sample files (JS, TS, JSON, MD)
- Bash commands
- Search queries
- Settings configurations
- Tool calls

### Edge Case Generators (`edge-case-generators.ts`)

Functions to generate edge cases for testing:

- Long strings
- Special characters
- Unicode strings
- Whitespace variations
- Large arrays/objects
- Boundary numbers
- Malformed inputs
- Error scenarios

## Test Helpers (`test-helpers.ts`)

Utility functions for tests:

- `withTempDir()` - Execute callback with temp directory
- `setupMockFileSystem()` - Set up mock file system
- `assertToolResultSuccess()` - Assert successful tool result
- `assertToolResultFailure()` - Assert failed tool result
- `delay()` - Promise-based delay
- `waitFor()` - Wait for condition with timeout
- `createMockConsole()` - Create console mock

## Coverage Goals

- **Overall**: 80% coverage
- **Critical paths (agent/core)**: 95% coverage
- **Tools**: 85% coverage
- **Utilities**: 90% coverage

## Writing Tests

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    // Arrange: Set up test environment
  });

  it("should do something", async () => {
    // Arrange: Prepare inputs
    const input = "test";

    // Act: Execute code
    const result = await component.doSomething(input);

    // Assert: Verify results
    expect(result).toBe("expected");
  });
});
```

### Test Naming

Use descriptive names that explain what's being tested:

```typescript
it("should return success when file exists", async () => {
  // ...
});

it("should throw error when file not found", async () => {
  // ...
});
```

### Testing Edge Cases

Always test:

- Empty inputs
- Null/undefined values
- Maximum/minimum values
- Special characters
- Unicode
- Large inputs

### Parameterized Tests

Use `test.each` for multiple data sets:

```typescript
test.each([
  ["input1", "output1"],
  ["input2", "output2"],
  ["input3", "output3"],
])("should transform %s to %s", (input, expected) => {
  const result = transform(input);
  expect(result).toBe(expected);
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up after each test (use `afterEach`)
3. **Mocking**: Mock external dependencies (API, file system, network)
4. **Descriptive names**: Use clear, descriptive test names
5. **Error testing**: Test both success and error paths
6. **Async handling**: Properly handle promises and async operations
7. **Timeout handling**: Tests should complete within reasonable time
8. **Type safety**: Use TypeScript types correctly

## Running Specific Tests

### Run a single test file

```bash
bunx vitest src/tests/unit/tools/text-editor.test.ts
```

### Run tests matching pattern

```bash
bunx vitest --grep "text editor"
```

### Run tests with specific file pattern

```bash
bunx vitest src/tests/unit/tools/
```

## Coverage Reports

Coverage reports are generated in `coverage/`:

- `index.html` - Interactive HTML report
- `lcov.info` - LCOV format for CI tools
- `coverage.json` - JSON format

Open the HTML report:

```bash
bun run test:coverage
# Then open coverage/index.html in a browser
```

## Continuous Integration

Tests run automatically in CI:

- All tests must pass
- Coverage thresholds must be met
- No new code below coverage thresholds

## Troubleshooting

### Tests failing due to imports

Make sure all imports use relative paths from the test file location.

### Mock not resetting properly

Use `vi.restoreAllMocks()` in `afterEach` to clean up.

### Timeout errors

Increase timeout in the test:

```typescript
it(
  "should complete",
  async () => {
    // ...
  },
  { timeout: 30000 },
);
```

### Coverage not updating

Delete the `coverage/` directory and run tests again.

## Adding New Tests

1. Create test file in appropriate directory
2. Import necessary mocks and helpers
3. Write tests following best practices
4. Run tests to verify they pass
5. Check coverage to ensure adequate coverage
6. Commit with descriptive message

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
