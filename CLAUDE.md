# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Super Agent CLI** is an AI-powered command-line interface tool that brings conversational AI directly into the terminal. It's built with TypeScript and uses:

- **Bun** as the build tool and runtime
- **Ink** (React for terminals) for the TUI
- **Commander.js** for CLI argument parsing
- **OpenAI-compatible API** interface for multiple LLM providers

The tool allows users to interact with AI through natural language to perform file operations, execute bash commands, search code, and manage projects with MCP (Model Context Protocol) integrations.

## Development Commands

```bash
# Development
bun run dev              # Run with hot-reload using Bun
bun run build            # Compile TypeScript to ESM in dist/
bun run typecheck        # TypeScript type validation
bun run lint             # ESLint code quality checks
bun run lint:fix         # Auto-fix ESLint issues
bun run format           # Prettier code formatting

# Build variants
bun run compile          # Create single executable (super-agent-cli.exe)

# Plugins
bun run build:plugins    # Build all plugin workspaces
```

Note: No tests are currently implemented (this is a known TODO item).

## High-Level Architecture

### Core Pattern: Provider-based LLM system with modular tools

The application follows a **provider pattern** where multiple LLM providers (Grok, Gemini, OpenAI, OpenAI-compatible) implement a unified `LLMProvider` interface. The `SuperAgent` class orchestrates interactions between the LLM, tools, and user interface.

### Directory Structure

```
src/
├── index.ts              # Main entry point (Commander CLI app)
├── agent/
│   ├── super-agent.ts    # SuperAgent class (LLM-powered, tool-calling agent)
│   └── index.ts          # Basic Agent (simple text editor + bash, no LLM)
├── core/
│   ├── llm-provider.ts   # LLM provider interface (LLMProvider, LLMMessage, etc.)
│   ├── tools.ts          # Tool registry and MCP integration
│   └── providers/        # LLM provider implementations
│       ├── grok.ts       # xAI Grok provider
│       ├── gemini.ts     # Google Gemini provider
│       ├── openai.ts     # OpenAI provider
│       └── openai-compatible.ts  # Generic OpenAI-compatible API wrapper
├── tools/                # Concrete tool implementations
│   ├── bash.ts           # Shell command execution
│   ├── text-editor.ts    # File operations (view, create, edit)
│   ├── morph-editor.ts   # Fast code editing (4500+ tokens/sec)
│   ├── search.ts         # Text + file search using ripgrep
│   ├── project-map.ts    # Project structure overview
│   └── index.ts          # Tool exports
├── ui/                   # React/Ink terminal UI
│   ├── app.tsx           # Main app component
│   ├── components/       # UI components (chat interface, input, etc.)
│   └── hooks/            # React hooks for UI state management
├── commands/             # Custom CLI commands
│   ├── index.ts          # Command registry
│   ├── git.ts            # Git operations (commit-and-push, etc.)
│   ├── plugins.ts        # Plugin management
│   ├── mcp.ts            # MCP server management
│   └── web.ts            # Web interface
├── utils/
│   ├── settings-manager.ts  # Hierarchical config management
│   ├── custom-instructions.ts # Project/global instructions (SUPER_AGENT.md)
│   └── model-config.ts       # Model mapping per provider
├── mcp/                  # Model Context Protocol client/server
├── plugins/              # Plugin system for extensibility
└── types/                # TypeScript definitions
```

## Key Architectural Patterns

### 1. LLM Provider Pattern

All LLM providers implement the `LLMProvider` interface defined in `src/core/llm-provider.ts`:

```typescript
interface LLMProvider {
  name: string;
  setModel(model: string): void;
  getCurrentModel(): string;
  chat(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<LLMResponse>;
  chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<any, void, unknown>;
  listModels(): Promise<string[]>;
}
```

Providers are selected via the `active_provider` setting in `settings.json`.

### 2. Tool Pattern

Tools are modular components that implement a common interface. The `SuperAgent` automatically selects and calls tools based on user requests. Built-in tools include:

- `TextEditorTool` - File operations (view, create, edit)
- `BashTool` - Shell command execution
- `MorphEditorTool` - Fast code editing
- `SearchTool` - Unified search (text + files)
- `ProjectMapTool` - Project structure overview

### 3. Settings Hierarchy

Settings are loaded in the following priority order:

1. **CLI arguments** (`--api-key`, `--model`, etc.) - highest priority
2. **Project settings** (`.super-agent/settings.json`)
3. **User settings** (`~/.super-agent/settings.json`)
4. **Defaults** - lowest priority

User settings store API keys and default models across all projects. Project settings override these for specific projects.

### 4. Two Agent Types

- **`SuperAgent`** (`src/agent/super-agent.ts`): Full LLM-powered agent with tool calling, streaming responses, MCP support, and multi-round tool execution (default 400 rounds).
- **`Agent`** (`src/agent/index.ts`): Simplified agent with direct command parsing (view, str_replace, create, insert, bash) without LLM.

### 5. MCP Integration

Model Context Protocol support allows extending capabilities with external tools (Linear, GitHub, etc.). MCP servers are configured in `settings.json` under the `mcpServers` key.

### 6. Custom Instructions

Projects can include `.super-agent/SUPER_AGENT.md` for project-specific instructions, and users can have `~/.super-agent/SUPER_AGENT.md` for global instructions. These are loaded and prepended to the system prompt.

## Key Files

| File                            | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `src/index.ts`                  | CLI entry point, Commander.js configuration, signal handling |
| `src/agent/super-agent.ts`      | Core agent class with LLM interaction and tool orchestration |
| `src/core/llm-provider.ts`      | LLM provider interface definitions                           |
| `src/core/tools.ts`             | Tool registry and MCP integration                            |
| `src/utils/settings-manager.ts` | Settings loading and hierarchical config management          |
| `package.json`                  | Dependencies, scripts, and workspace configuration           |
| `tsconfig.json`                 | TypeScript config (ES2022, strict mode, JSX for Ink)         |

## Code Style

Based on `.prettierrc` and `eslint.config.mjs`:

- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Required (`true`)
- **Quotes**: Double quotes (`singleQuote: false`)
- **Trailing commas**: All objects/arrays (`trailingComma: "all"`)
- **Arrow function parens**: Avoid when possible (`arrowParens: "avoid"`)
- **Imports**: Auto-organized via `prettier-plugin-organize-imports`

TypeScript configuration:

- Target: ES2022, Module: ESNext
- Strict mode enabled (but `noImplicitAny: false`)
- JSX: `react-jsx` (for Ink components)
- Module resolution: `Bundler`

## Supported Providers

The project supports multiple LLM providers via the `PROVIDER_MODELS` mapping in `settings-manager.ts`:

- **Grok**: `grok-beta`, `grok-vision-beta`, `grok-code-fast-1`
- **Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o1-mini`
- **Mistral**: `mistral-large-latest`, `codestral-latest`
- **OpenRouter**: Various models (Claude, GPT, Llama, etc.)
- **Others**: Groq, DeepSeek, Ollama, Cloudflare Workers AI, Zai

## Workspaces

The project uses Bun workspaces for plugins:

```json
"workspaces": [
  "@plugins/templates/*",
  "@plugins/examples/*"
]
```

**Note**: The `vscode-extension/` workspace uses `npm` for dependency management (required by `vsce` packaging tool), while the root project uses `bun`. This is a necessary hybrid approach because `vsce` requires `npm list` validation which doesn't work with bun's lockfile format.

Plugin templates and examples are developed as separate packages in the `@plugins/` directory.
