# Plugin Development Quickstart

Build your first Super Agent CLI plugin in 5 minutes!

## Prerequisites

- Node.js 18+ or Bun
- Super Agent CLI installed (`npm install -g @involvex/super-agent-cli`)
- TypeScript knowledge (optional but recommended)

## Step 1: Copy a Template

Start with the basic template:

```bash
cp -r templates/basic my-plugin
cd my-plugin
```

## Step 2: Customize Your Plugin

Edit `src/index.ts`:

```typescript
import { SuperAgentPlugin, SuperAgentTool } from "@involvex/super-agent-cli";

const helloTool: SuperAgentTool = {
  type: "function",
  function: {
    name: "say_hello",
    description: "Says hello to a person",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the person to greet",
        },
      },
      required: ["name"],
    },
    executor: async args => {
      return `Hello, ${args.name}! 👋`;
    },
  },
};

export const plugin: SuperAgentPlugin = {
  name: "my-plugin",
  version: "1.0.0",
  description: "My first Super Agent plugin",
  tools: [helloTool],

  async onInit(context) {
    console.log("Plugin initialized!");
  },
};

export default plugin;
```

## Step 3: Build Your Plugin

```bash
npm install
npm run build
```

This creates `dist/index.js` - your compiled plugin.

## Step 4: Install and Test

```bash
# Install the plugin
super-agent plugins install ./dist/index.js

# Test it in interactive mode
super-agent

# In the chat, try:
# "say hello to Alice"
```

## Step 5: Verify It Works

The AI should use your `say_hello` tool automatically when appropriate!

## Next Steps

### Add More Tools

Add additional tools to the `tools` array:

```typescript
const farewellTool: SuperAgentTool = {
  type: "function",
  function: {
    name: "say_goodbye",
    description: "Says goodbye to a person",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the person" },
      },
      required: ["name"],
    },
    executor: async args => {
      return `Goodbye, ${args.name}! 👋`;
    },
  },
};

export const plugin: SuperAgentPlugin = {
  // ... other properties
  tools: [helloTool, farewellTool],
};
```

### Add Configuration

Accept custom configuration in `onInit`:

```typescript
async onInit(context) {
  const apiKey = context.config.apiKey;
  if (!apiKey) {
    throw new Error("API key required!");
  }
  // Initialize your service with the API key
}
```

Users configure via `~/.super-agent/settings.json`:

```json
{
  "plugins": ["./my-plugin/dist/index.js"],
  "pluginConfigs": {
    "my-plugin": {
      "apiKey": "your-key-here"
    }
  }
}
```

### Handle Errors

Always validate inputs and handle errors gracefully:

```typescript
executor: async args => {
  try {
    if (!args.name || typeof args.name !== "string") {
      throw new Error("Name must be a non-empty string");
    }

    // Your logic here
    return `Hello, ${args.name}!`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
};
```

### Make It Async

For API calls or I/O operations:

```typescript
executor: async args => {
  const response = await fetch(`https://api.example.com/greet/${args.name}`);
  const data = await response.json();
  return data.message;
};
```

## Advanced Topics

For more advanced features, check out the [advanced template](../templates/advanced/) which includes:

- Multiple tools
- External API integration
- State management
- Error handling
- TypeScript configuration
- Tests
- CI/CD setup

## Troubleshooting

**Plugin not loading?**

- Check that `dist/index.js` exists
- Verify the export: `export default plugin;` or `export const plugin = ...`
- Check the console for error messages

**Tool not being called?**

- Make sure the `description` clearly explains when to use the tool
- Test with explicit requests: "use say_hello to greet Bob"
- Check that required parameters are properly defined

**Type errors?**

- Install type definitions: `npm install -D @involvex/super-agent-cli`
- Check your `tsconfig.json` matches the template

## Example Plugins

Explore working examples in the `examples/` directory:

- **[weather](../examples/weather/)** - API integration
- **[database](../examples/database/)** - Multiple tools
- **[notify](../examples/notify/)** - System integration

## Getting Help

- [GitHub Issues](https://github.com/involvex/super-agent-cli-plugins/issues)
- [Main Documentation](https://github.com/involvex/super-agent-cli)

Happy plugin building! 🎉
