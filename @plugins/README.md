# Super Agent CLI Plugins

Official plugin repository for [Super Agent CLI](https://github.com/involvex/super-agent-cli).

Extend your Super Agent CLI with custom tools, integrations, and capabilities through a simple plugin system.

## 🚀 Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a step-by-step guide to creating your first plugin.

## 📦 Available Examples

Explore fully-functional example plugins in the `examples/` directory:

- **[weather](./examples/weather/)** - External API integration with weather data
- **[database](./examples/database/)** - Database query tools with state management
- **[notify](./examples/notify/)** - System notifications and cross-platform integration

## 🎨 Templates

Get started quickly with our templates in the `templates/` directory:

- **[basic](./templates/basic/)** - Minimal single-tool plugin
- **[advanced](./templates/advanced/)** - Full-featured plugin with tests and CI

## 📖 Plugin API

All plugins must export a `SuperAgentPlugin` object:

```typescript
export interface SuperAgentPlugin {
  name: string; // Unique plugin identifier
  version: string; // Semantic version
  description?: string; // Human-readable description
  tools?: SuperAgentTool[]; // Tools provided by this plugin
  onInit?: (context: PluginContext) => Promise<void>;
  onShutdown?: () => Promise<void>;
}
```

### Tool Definition

```typescript
export interface SuperAgentTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
    executor: (args: any, context: any) => Promise<string>;
  };
}
```

## 🔧 Installing Plugins

### From this repository:

```bash
super-agent plugins install @plugins/examples/weather
```

### From local file:

```bash
super-agent plugins install ./my-plugin.js
super-agent plugins install /path/to/plugin/dist/index.js
```

### List installed plugins:

```bash
super-agent plugins list
```

### Remove a plugin:

```bash
super-agent plugins uninstall weather
```

## 📝 Contributing

We welcome plugin contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Plugin Submission Checklist

- [ ] Plugin follows the API specification
- [ ] Includes README with usage examples
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Code is tested (for advanced plugins)

## 📄 License

MIT - See [LICENSE](LICENSE) for details.

## 🔗 Links

- [Super Agent CLI Documentation](https://github.com/involvex/super-agent-cli)
- [Plugin Quickstart Guide](./QUICKSTART.md)
- [Report Issues](https://github.com/involvex/super-agent-cli-plugins/issues)
