# @involvex/super-agent-cli

![Super Agent CLI Banner](docs/banner.png)
[![Security Scan](https://github.com/involvex/super-agent-cli/actions/workflows/security.yml/badge.svg)](https://github.com/involvex/super-agent-cli/actions/workflows/security.yml)
![Badge](https://img.shields.io/npm/v/@involvex/super-agent-cli?label=build&message=passing&color=brightgreen&style=social&logo=npm)

A conversational AI CLI tool powered by Super Agent with intelligent text editor capabilities and tool usage.

## Features

- **🤖 Conversational AI**: Natural language interface powered by Super Agent-3
- **📝 Smart File Operations**: AI automatically uses tools to view, create, and edit files
- **⚡ Bash Integration**: Execute shell commands through natural conversation
- **🔧 Automatic Tool Selection**: AI intelligently chooses the right tools for your requests
- **🚀 Morph Fast Apply**: Optional high-speed code editing at 4,500+ tokens/sec with 98% accuracy
- **🔌 MCP Tools**: Extend capabilities with Model Context Protocol servers (Linear, GitHub, etc.)
- **💬 Interactive UI**: Beautiful terminal interface built with Ink
- **🌍 Global Installation**: Install and use anywhere with `bun add -g @involvex/super-agent-cli`

## Installation

### Prerequisites

bun add -g @involvex/super-agent-cli

Or with npm (fallback):

npm install -g @involvex/super-agent-cli

## Configuration Files

Super Agent CLI uses two types of configuration files to manage settings:

### User-Level Settings (`~/.super-agent/settings.json`)

This file stores **global settings** that apply across all projects. These settings rarely change and include:

- **API Key**: Your Super Agent API key
- **Base URL**: Custom API endpoint (if needed)
- **Default Model**: Your preferred model (e.g., `gemini-3.0-flash`)
- **Available Models**: List of models you can use

**Example:**

```json
{
  "active_provider": "gemini",
  "providers": {
    "gemini": {
      "id": "gemini",
      "provider": "gemini",
      "model": "MODEL_NAME",
      "api_key": "API_KEY",
      "base_url": "BASE_URL (optional)",
      "default_model": "MODEL_NAME"
    }
  }
}
```

### Project-Level Settings (`.super-agent/settings.json`)

This file stores **project-specific settings** in your current working directory. It includes:

- **Current Model**: The model currently in use for this project
- **MCP Servers**: Model Context Protocol server configurations

**Example:**

```json
{
  "active_provider": "gemini",
  "providers": {
    "gemini": {
      "id": "gemini",
      "provider": "gemini",
      "model": "MODEL_NAME",
      "api_key": "API_KEY",
      "base_url": "BASE_URL (optional)",
      "default_model": "MODEL_NAME"
    }
  },
  "mcpServers": {
    "linear": {
      "name": "linear",
      "transport": "stdio",
      "command": "npx",
      "args": ["@linear/mcp-server"]
    }
  }
}
```

### How It Works

1. **Global Defaults**: User-level settings provide your default preferences
2. **Project Override**: Project-level settings override defaults for specific projects
3. **Directory-Specific**: When you change directories, project settings are loaded automatically
4. **Fallback Logic**: Project model → User default model → System default (`gemini-3-pro-preview`)

This means you can have different models for different projects while maintaining consistent global settings like your API key.

### Using Other API Providers

**Important**: Super Agent CLI uses **OpenAI-compatible APIs**. You can use any provider that implements the OpenAI chat completions standard.

**Popular Providers**:

- **Google (Gemini)**: `https://generativelanguage.googleapis.com/v1beta/openai` (default)
- **OpenAI**: `https://api.openai.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Groq**: `https://api.groq.com/openai/v1`

**Example with OpenRouter**:

```json
{
  "apiKey": "your_openrouter_key",
  "baseURL": "https://openrouter.ai/api/v1",
  "defaultModel": "anthropic/claude-3.5-sonnet",
  "models": [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "meta-llama/llama-3.1-70b-instruct"
  ]
}
```

## Usage

### Interactive Mode

Start the conversational AI assistant:

```bash
super-agent
# or
super-agent about
# or
super-agent plugins list
```

Or specify a working directory:

```bash
super-agent -d /path/to/project
```

### Interactive Features

Super Agent CLI provides several interactive features to enhance your workflow:

- **Shell Mode**: Press `shift+!` to toggle shell mode for direct command execution
- **Agent Modes**: Press `shift+tab` to cycle through modes (plan, code, debug)
- **Command Palette**: Press `ctrl+p` to open a quick command palette
- **Auto-Edit Toggle**: Press `ctrl+y` to toggle auto-edit mode
- **Configurable Hotkeys**: All hotkeys can be customized in settings
- **File Mentions**: Reference files using `@filename` in your prompts
- **Folder Mentions**: Reference entire folders using `@folder` in your prompts

Start the conversational AI assistant:

```bash
super-agent
# or
super-agent about
# or
super-agent plugins list
```

Or specify a working directory:

```bash
super-agent -d /path/to/project
```

### Headless Mode

Process a single prompt and exit (useful for scripting and automation):

```bash
super-agent --prompt "show me the package.json file"
super-agent -p "create a new file called example.js with a hello world function"
super-agent --prompt "run bun test and show me the results" --directory /path/to/project
super-agent --prompt "complex task" --max-tool-rounds 50  # Limit tool usage for faster execution
```

This mode is particularly useful for:

- **CI/CD pipelines**: Automate code analysis and file operations
- **Scripting**: Integrate AI assistance into shell scripts
- **Terminal benchmarks**: Perfect for tools like Terminal Bench that need non-interactive execution
- **Batch processing**: Process multiple prompts programmatically

### Tool Execution Control

By default, Super Agent CLI allows up to 400 tool execution rounds to handle complex multi-step tasks. You can control this behavior:

```bash
# Limit tool rounds for faster execution on simple tasks
super-agent --max-tool-rounds 10 --prompt "show me the current directory"

# Increase limit for very complex tasks (use with caution)
super-agent --max-tool-rounds 1000 --prompt "comprehensive code refactoring"

# Works with all modes
super-agent --max-tool-rounds 20  # Interactive mode
super-agent git commit-and-push --max-tool-rounds 30  # Git commands
```

**Use Cases**:

- **Fast responses**: Lower limits (10-50) for simple queries
- **Complex automation**: Higher limits (500+) for comprehensive tasks
- **Resource control**: Prevent runaway executions in automated environments

### Model Selection

You can specify which AI model to use with the `--model` parameter

# Use Super Agent models

super-agent --model gemini-3-pro-preview
super-agent --model gemini-2.5-pro
super-agent --model gemini-2.5-flash

**Method 2: User Settings File**
Add to `~/.super-agent/settings.json`:

**Model Priority**: `--model` flag > user default model > system default (gemini-3-pro-preview)

### Command Line Options

```bash
super-agent [options]

Options:
  -V, --version          output the version number
  -d, --directory <dir>  set working directory
  -k, --api-key <key>    Super Agent API key (or set SUPER_AGENT_API_KEY env var)
  -u, --base-url <url>   Super Agent API base URL (or set SUPER_AGENT_BASE_URL env var)
  -m, --model <model>    AI model to use (e.g., super-agent-code-fast-1, super-agent-4-latest) (or set SUPER_AGENT_MODEL env var)
  -p, --prompt <prompt>  process a single prompt and exit (headless mode)
  --max-tool-rounds <rounds>  maximum number of tool execution rounds (default: 400)
  -h, --help             display help for command

Commands:
  about                                      Show information about the Super Agent CLI
  plugins list/install/uninstall <name/path> Manage plugins for Super Agent CLI
  git                                        Git operations with AI assistance
  mcp                                        Manage MCP servers
  web                                        Start web interface
  serve                                      Start both TUI and web interfaces
```

**Note**: In addition to these command-line commands, all slash commands (e.g., `/init`, `/config`, `/models`, `/chat`, `/plugin`, `/help`) are available in interactive mode. See the [Command Reference](#command-reference) section for a complete list of available slash commands.

### Web Interface

Super Agent CLI provides a web interface for a more visual and accessible experience.

#### Starting the Web Interface

```bash
# Start only the web interface
super-agent web

# Start both the TUI (terminal UI) and web interfaces
super-agent serve
```

#### Web Interface Features

The web interface offers:

- **Modern Browser-Based UI**: Access the AI assistant through any modern web browser
- **Real-Time Chat**: Engage in conversational AI interactions with streaming responses
- **File Explorer**: Browse and manage project files visually
- **Tool Visualization**: See tools being used in real-time with detailed output
- **Chat History**: View and manage conversation history
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Multi-Session Support**: Run multiple sessions simultaneously
- **Persistent Connection**: Maintains connection state across interactions

The web interface provides all the functionality of the TUI with the added convenience of a graphical interface, making it easier to visualize file operations, tool usage, and complex workflows.

### Command Reference

Super Agent CLI provides a comprehensive set of commands to manage your AI assistant sessions.

#### Project Setup

```bash
/init           # Create AGENTS.md in project root with template instructions
```

#### Configuration

```bash
/config         # Configure API keys, models, base URLs, and other settings
```

#### Model Management

```bash
/models                    # List all available models
/models <model>            # Switch to a specific model
/models <model> <prompt>   # Switch to a model and immediately run a prompt
```

#### Chat Management

```bash
/chat                       # Show current chat information
/chat save <chat_name>      # Save the current chat
/chat load <chat_name>      # Load a saved chat
/chat list                  # List all saved chats
/chat delete <chat_name>    # Delete a saved chat
/chat clear                 # Clear the current chat history
```

#### Plugin Management

```bash
/plugin install <plugin_name>    # Install a plugin from GitHub, local path, or file
/plugin list                    # List all installed plugins
/plugin delete <plugin_name>     # Delete an installed plugin
```

#### MCP Tools

```bash
/mcp add <name> [options]    # Add a new MCP server
/mcp list                    # List all configured MCP servers
/mcp test <name>             # Test a MCP server connection
/mcp remove <name>           # Remove a MCP server
```

#### General Commands

```bash
/help           # Show help information and available commands
/clear          # Clear the current chat history
/exit           # Exit the CLI
```

#### Usage Examples

```bash
# Initialize project with agent instructions
/init

# Switch to Gemini Flash and run a prompt
/models gemini-2.5-flash "explain this codebase"

# Save current chat session
/chat save feature-development

# Load a previous chat session
/chat load feature-development

# Install a plugin from GitHub
/plugin install involvex/super-agent-cli-plugins

# Configure API settings
/config
```

### Plugin System

Extend Super Agent with custom tools and capabilities through plugins.

#### Installing Plugins

**From GitHub Repository:**

```bash
# Full URL
super-agent plugins install https://github.com/involvex/super-agent-cli-plugins

# Short format (owner/repo)
super-agent plugins install involvex/super-agent-cli-plugins
```

**From Local Directory:**

```bash
super-agent plugins install ./my-plugin
super-agent plugins install /path/to/plugin-directory
```

**From File:**

```bash
super-agent plugins install ./plugin.js
super-agent plugins install /path/to/plugin/dist/index.js
```

#### Managing Plugins

```bash
# List installed plugins
super-agent plugins list

# Uninstall a plugin
super-agent plugins uninstall plugin-name
```

#### Creating Plugins

See the [official plugin repository](https://github.com/involvex/super-agent-cli-plugins) for:

- Example plugins (weather, database, notifications)
- Plugin templates
- Quickstart guide
- API documentation

### Custom Instructions

You can provide custom instructions to tailor Super Agent's behavior to your project or globally. Super Agent CLI reads agent and skill configurations from multiple locations.

#### Agent Instructions (AGENTS.md)

Super Agent CLI reads agent instructions from these locations, in order of priority:

1. `AGENTS.md` in project root - highest priority
2. `.super-agent/AGENTS.md` in project directory
3. `.super-agent/agents/*.md` - individual agent files
4. `~/.super-agent/AGENTS.md` in home directory
5. `~/.super-agent/agents/*.md` - global agent files

Create project-specific agent instructions:

```bash
mkdir -p .super-agent
```

Create `.super-agent/AGENTS.md` with your project-specific instructions:

```markdown
# Custom Agent Instructions for This Project

Always use TypeScript for any new code files.
When creating React components, use functional components with hooks.
Prefer const assertions and explicit typing over inference where it improves clarity.
Always add JSDoc comments for public functions and interfaces.
Follow the existing code style and patterns in this project.
```

#### Skill Instructions (SKILLS.md)

Skill configurations follow the same priority order:

1. `SKILLS.md` in project root - highest priority
2. `.super-agent/SKILLS.md` in project directory
3. `.super-agent/skills/*.md` - individual skill files
4. `~/.super-agent/SKILLS.md` in home directory
5. `~/.super-agent/skills/*.md` - global skill files

#### Global Instructions

For instructions that apply across all projects, create `~/.super-agent/AGENTS.md` in your home directory:

```bash
mkdir -p ~/.super-agent
```

Create `~/.super-agent/AGENTS.md` with your global instructions:

```markdown
# Global Agent Instructions for Super Agent CLI

Always prioritize code readability and maintainability.
Use descriptive variable names and add comments for complex logic.
Follow best practices for the programming language being used.
When suggesting code changes, consider performance implications.
```

#### Priority Order

Super Agent will load custom instructions in the following priority order:

1. **Project-level files** take highest priority
2. **Global files** serve as fallback if no project instructions exist
3. **Individual files** (`*.md`) are merged into a single instruction set

If multiple files exist, they are combined with project instructions taking precedence. If neither exists, Super Agent operates with its default behavior.

The custom instructions are added to Super Agent's system prompt and influence its responses across all interactions in the respective context.

## MCP Tools

Super Agent CLI supports MCP (Model Context Protocol) servers, allowing you to extend the AI assistant with additional tools and capabilities.

### Adding MCP Tools

#### Add a custom MCP server:

```bash
# Add an stdio-based MCP server
super-agent mcp add my-server --transport stdio --command "bun" --args server.js

# Add an HTTP-based MCP server
super-agent mcp add my-server --transport http --url "http://localhost:3000"

# Add with environment variables
super-agent mcp add my-server --transport stdio --command "python" --args "-m" "my_mcp_server" --env "API_KEY=your_key"
```

#### Add from JSON configuration:

```bash
super-agent mcp add-json my-server '{"command": "bun", "args": ["server.js"], "env": {"API_KEY": "your_key"}}'
```

### Linear Integration Example

To add Linear MCP tools for project management:

```bash
# Add Linear MCP server
super-agent mcp add linear --transport sse --url "https://mcp.linear.app/sse"
```

This enables Linear tools like:

- Create and manage Linear issues
- Search and filter issues
- Update issue status and assignees
- Access team and project information

### Managing MCP Servers

```bash
# List all configured servers
super-agent mcp list

# Test server connection
super-agent mcp test server-name

# Remove a server
super-agent mcp remove server-name
```

### Available Transport Types

- **stdio**: Run MCP server as a subprocess (most common)
- **http**: Connect to HTTP-based MCP server
- **sse**: Connect via Server-Sent Events

## Development

```bash
# Install dependencies
bun install

# Development mode
bun run dev

# Build project
bun run build

# Run linter
bun run lint

# Type check
bun run typecheck
```

## Architecture

- **Agent**: Core command processing and execution logic
- **Tools**: Text editor and bash tool implementations
- **UI**: Ink-based terminal interface components
- **Types**: TypeScript definitions for the entire system

## License

MIT
