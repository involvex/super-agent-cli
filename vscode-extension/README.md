# Super Agent VS Code Extension

A VS Code extension that connects to the Super Agent CLI, providing an integrated AI coding assistant with file context support.

## Features

- **Integrated Chat Interface**: Access Super Agent AI directly from the VS Code sidebar
- **File Context Mentions**: Reference files in your chat using `@path/to/file.ts` syntax
- **Active Editor Integration**: Quickly mention the current file or open files
- **Real-time Connection**: WebSocket-based connection to the running Super Agent CLI
- **Command Execution**: Execute Super Agent commands directly from VS Code

## Installation

1. Install the Super Agent CLI: `npm install -g super-agent-cli`
2. Run the CLI with web support: `super-agent --web` in your project directory
3. Install this VS Code extension from the marketplace

## Usage

### Starting the Extension

1. Start the Super Agent CLI with web support:

   ```bash
   super-agent --web
   ```

2. The extension will automatically connect to the CLI on startup

3. Click on the Super Agent icon in the activity bar to open the chat panel

### File Mentions

Reference files in your conversations using the `@` symbol:

```
@src/index.ts explain the main function
```

You can:

- Type `@` followed by a file path manually
- Click the "@ Current File" button to mention the active file
- Click on any open file button to mention it

### Commands

| Command                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| `super-agent.openChat`    | Open/focus the Super Agent chat panel        |
| `super-agent.mentionFile` | Show file picker to select a file to mention |
| `super-agent.askAI`       | Ask AI about selected text or current file   |

### Configuration

| Setting                  | Default     | Description                               |
| ------------------------ | ----------- | ----------------------------------------- |
| `superAgent.cliPort`     | `3000`      | Port for Super Agent CLI WebSocket server |
| `superAgent.cliHost`     | `localhost` | Host for Super Agent CLI WebSocket server |
| `superAgent.autoConnect` | `true`      | Automatically connect to CLI on startup   |

## Development

**Note**: This extension uses `npm` for dependency management (required by `vsce` packaging tool), while the root project uses `bun`.

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm run test

# Package extension
vsce package
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     VS Code Extension                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Sidebar    │  │ File Picker  │  │  Chat Panel   │  │
│  │  (Chat UI)   │  │ (@mentions)  │  │  (Messages)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                    ┌───────▼────────┐                    │
│                    │  Extension     │                    │
│                    │  Host (IPC)    │                    │
│                    └───────┬────────┘                    │
└────────────────────────────┼─────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│              Super Agent CLI (WebSocket Server)          │
├─────────────────────────────────────────────────────────┤
│  - Receives messages with file context                  │
│  - Returns responses with tool results                  │
│  - Provides file tree and content                       │
└─────────────────────────────────────────────────────────┘
```

## License

MIT
