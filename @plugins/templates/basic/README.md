# Basic Plugin Template

A minimal template for creating Super Agent CLI plugins.

## Quick Start

1. **Copy this template:**

   ```bash
   cp -r templates/basic my-plugin
   cd my-plugin
   ```

2. **Customize `src/index.ts`:**
   - Change plugin name, version, description
   - Replace `example_tool` with your own tool
   - Update the tool's name, description, and parameters

3. **Build:**

   ```bash
   npm install
   npm run build
   ```

4. **Install:**
   ```bash
   super-agent plugins install ./dist/index.js
   ```

## Structure

```
basic/
├── src/
│   └── index.ts       # Plugin implementation
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Next Steps

- See [QUICKSTART.md](../../QUICKSTART.md) for detailed guide
- Check [examples/](../../examples/) for more complex plugins
- Use [advanced template](../advanced/) for full-featured plugins

## License

MIT
