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
