# @involvex/super-agent-cli

## Plan

Build a Agentic Coding Cli Tool using Bun. Support multiple LLMs like Grok, GPT, Claude, Llama, Gemini, Zai, Cloudflare Ai, Workers Ai, OpenRouter, Mistral, Minimax, Nanogpt. Allow configure api keys, models, etc. via config file and slash commands.

## Features

- Code editing, generation, and analysis
- File operations (create, read, update, delete)
- Shell command execution
- Folder Indexing
- Global Config (~/.super-agent/config.json)
- Project Config (.super-agent/config.json)
- Agents Config (Agents.md, .Agents/, .super-agent/agents/, ~/.super-agent/agents/)
- Skills Config (Skills.md, .Skills/, .super-agent/skills/, ~/.super-agent/skills/)
- MCP Tools Support(in own config or from .mcp.json in Project folder)
- Chat Interface
- Plugins Support
- Commands: /init(create Agents.md), /config(configure api keys, models, etc.), /mcp(add mcp servers), /help(show help), /exit(exit the cli), /clear(clear the chat history), /models(list available models), /models <model>(switch to a model), /models <model> <prompt>(switch to a model and run a prompt),/chat save <chat_name>(save the current chat), /chat load <chat_name>(load a chat), /chat list(list all chats), /chat delete <chat_name>(delete a chat), /chat clear(clear the current chat), /chat(show current chat), /plugin install <plugin_name>(install a plugin), /plugin list(list all plugins), /plugin delete <plugin_name>(delete a plugin)

## Todo

- [ ] Add support for more LLMs
- [ ] Add support for more MCP Tools
- [ ] Add support for more Plugins
- [ ] Add support for more Commands
- [ ] Add support for more Features
- [ ] Build a clean production ready CLI tool
- [x] Update tsconfig.json to resolve file paths/ imports /endings (.ts, .tsx, .js, .jsx, .json, .mjs, .cjs, .mts, .cts)
- [x] Rename from grok-cli to super-agent-cli (update config files, commands, etc.)
- [x] Setup Dev Environment (bun run dev willhotreload from src/index.ts)
- [ ] Write tests
- [x] Add mentioning for files (@filename) and folders (@folder)
- [x] shell mode (shift+!)
- [x] switching modes(plan, code, debug) (shift+tab)
- [x] configurable hotkeys
- [x] Command Palette (ctrl+p)

## Completed Features

### CLI UI Input Bug Fixes ✅

- Fixed command palette (Ctrl+P) - now replaces input instead of appending
- Fixed @mentions completion - proper cursor positioning
- Fixed provider selection with 'e' - cursor at end of command
- Added centralized UI state cleanup function

### Dynamic Plugin Repository System ✅

- Created `src/plugins/repository-manager.ts` with git submodule support
- Added `/repo install`, `/repo list`, `/repo update`, `/repo enable`, `/repo disable` commands
- Supports agents, skills, hooks, and MCP repositories

### VS Code Extension ✅

- Created `vscode-extension/` workspace
- Implemented chat webview with file context mentions
- Added WebSocket connector to CLI
- Created file context provider for @mentions
- Fixed icon property - using PNG format (icon.png) for VS Code marketplace compatibility

### WebSocket Graceful Degradation ✅

- Added disconnected mode for Firebase Hosting
- Shows informative banner when CLI not connected
- Disables interactive elements in read-only mode

### Project Restructuring ✅

- Reorganized documentation into docs/ directory
- Consolidated assets into assets/ directory with subdirectories:
  - `assets/images/` - banner.png, favicon.png, logo.png
  - `assets/vscode/` - icon.svg (kept for reference)
- Removed unused directories (.kilocode/, .mira/)
- Removed redundant files (index.md)
- Fixed workspace dependencies
- Optimized UI components with custom hooks
- VS Code extension uses icon.png (copied from assets/images/logo.png)

### UI Optimization ✅

- Created custom hooks (use-command-history, use-keyboard-input)
- Extracted UI components (Header, CommandHelp, CommandHistory, CommandInput)
- Refactored app.tsx with modern React patterns
- Added proper TypeScript types for setState handlers

## Current Status (v0.0.79)

**Architecture**: Provider-based LLM system with modular tools
**Build System**: Bun with TypeScript, ESM output
**Testing**: Vitest configured (tests to be implemented)
**UI Framework**: Ink (React for terminals)
**Supported Providers**: Grok, Gemini, OpenAI, OpenAI-compatible, Mistral, OpenRouter, Groq, DeepSeek, Ollama, Cloudflare Workers AI, Zai

## Next Steps

### Immediate (P0 - Critical)

1. **Test Framework Implementation**
   - Write unit tests for core agent logic
   - Write integration tests for CLI commands
   - Write component tests for React/Ink UI
   - Set up CI/CD pipeline

2. **Chat History Management**
   - Implement save/load functionality
   - Add chat history listing and search
   - Export to various formats (Markdown, JSON)

### Short-term (P1 - High Priority)

3. **Advanced Agent/Skill System**
   - Agent listing and switching
   - Interactive agent creation
   - Skill enable/disable commands

4. **Enhanced Search**
   - Fuzzy search with ripgrep
   - Search filters and caching
   - Code-aware search (functions, classes)

5. **Code Review Tools**
   - `/review` command for code review
   - `/analyze` for code quality analysis
   - `/refactor` suggestions

## Technical Debt

- [ ] Comprehensive test coverage
- [ ] Error handling improvements
- [ ] Performance optimization for large codebases
- [ ] Better documentation for API surface
- [ ] Type safety improvements (strict mode)
