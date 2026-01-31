# Agent Instructions for Super Agent CLI

This file provides guidelines for coding agents working in the @involvex/super-agent-cli repository.

## Development Commands

### Build Commands

- `bun run build` - Build project to dist/
- `bun run build:bun` - Alternative build using bun
- `bun run build:plugins` - Build all plugins
- `bun run compile` - Compile to standalone executable
- `bun run dev` - Development mode with hot reload
- `bun run dev:node` - Run with tsx instead of bun

### Code Quality Commands

- `bun run lint` - Run ESLint to check code quality
- `bun run lint:fix` - Auto-fix ESLint issues
- `bun run typecheck` - Run TypeScript compiler for type checking
- `bun run format` - Format code with Prettier (includes import organization)
- `bun run format:check` - Check formatting without modifying files

### Pre-build Process

The `prebuild` script runs automatically: `bun run format && bun run lint:fix && bun run typecheck`
Always run this before building.

### Testing

**No test framework is currently configured** in this project. No test files (.test.ts, .spec.ts) exist and there are no test scripts in package.json.

## Code Style Guidelines

### Import Organization

- Imports are automatically organized and sorted by Prettier plugins
- Group external library imports first, then internal imports
- Use `import type { ... }` for type-only imports
- Prefer named exports over default exports where possible
- Example:
  ```typescript
  import { ConfirmationService } from "../utils/confirmation-service";
  import type { ChatEntry } from "../types/index";
  import * as fs from "fs-extra";
  ```

### Formatting Rules (Prettier)

- 80 character line width
- 2 space indentation (no tabs)
- Double quotes for strings (`"string"`, not `'string'`)
- Trailing commas required (in objects, arrays, functions)
- Semicolons required at end of statements
- No parentheses around single arrow function parameters: `x => x`
- JSX bracket on new line

### TypeScript Configuration

- Target: ES2022, Module: ESNext
- `strict: true` - Strict type checking enabled
- `noImplicitAny: false` - Some flexibility allowed
- `resolveJsonModule: true` - Can import JSON files
- `jsx: "react-jsx"` - JSX transforms for React
- `moduleResolution: "bundler"` - Bundler-style module resolution

### Type Definitions

- Export interfaces from type files: `export interface InterfaceName { }`
- Use PascalCase for interfaces and type names
- Optional properties: `propertyName?: string;`
- Avoid `any` when possible; use `unknown` for truly unknown types
- Function return types can be inferred but should be explicit for public APIs

### Naming Conventions

- **Classes**: PascalCase (`class TextEditorTool`)
- **Interfaces**: PascalCase (`interface ToolResult`)
- **Functions/Methods**: camelCase (`async execute()`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`MAX_TOOL_ROUNDS`)
- **Variables**: camelCase (`const chatHistory`)
- **Files**: kebab-case for utilities, PascalCase for components
  - Utilities: `text-editor.ts`, `settings-manager.ts`
  - Components: `chat-interface.tsx`

### Error Handling Pattern

Always use try/catch with typed error handling:

```typescript
async execute(): Promise<ToolResult> {
  try {
    // operation logic
    return { success: true, output: "result" };
  } catch (error: any) {
    return {
      success: false,
      error: `Operation failed: ${error.message}`,
    };
  }
}
```

- Return `ToolResult` objects with `success: boolean`, `output?: string`, `error?: string`
- Error messages should be descriptive and include context
- Use `error: any` for catch blocks to access `.message` property

### File Structure

- `src/agent/` - Core agent logic (`SuperAgent` class)
- `src/commands/` - CLI command implementations
- `src/core/` - Core abstractions (LLM providers, tools)
- `src/tools/` - Tool implementations (bash, text-editor, etc.)
- `src/ui/` - React/Ink UI components
- `src/utils/` - Utility functions and services
- `src/types/` - TypeScript type definitions
- `src/hooks/` - React hooks for UI state

### React/Ink Component Style

- Use functional components with hooks
- Explicitly type component props with interfaces
- Use `useRef`, `useState`, `useEffect` from React
- Components using Ink's `Box`, `Text` primitives
- Example:
  ```typescript
  interface Props {
    isActive: boolean;
  }
  function MyComponent({ isActive }: Props) {
    const [state, setState] = useState(false);
    return <Box><Text>Hello</Text></Box>;
  }
  export default MyComponent;
  ```

### ESLint Rules

- `curly: warn` - Always use curly braces for conditionals
- `eqeqeq: warn` - Use strict equality (`===`, `!==`)
- `no-throw-literal: warn` - Don't throw non-Error objects
- `semi: warn` - Semicolons required
- Import naming: camelCase or PascalCase allowed for imports

### Tool Implementation Pattern

Tools should implement a standard interface:

```typescript
export class MyTool {
  async execute(args: any): Promise<ToolResult> {
    // implementation
    return { success: true, output: "result" };
  }
}
```

- Always return `ToolResult` objects
- Handle errors gracefully
- Log meaningful error messages

### Git Workflow

- Build output (`dist/`) is ignored
- Plugin `node_modules` are ignored
- Environment files (`.env`) are ignored
- Use conventional commits when creating commits manually
