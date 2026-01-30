# Notification Plugin

Send desktop notifications from Super Agent CLI.

## Features

- Cross-platform support (macOS, Windows, Linux)
- Urgency levels (low, normal, critical)
- Simple, single-tool example

## Installation

```bash
super-agent plugins install @plugins/examples/notify
```

## Usage

```
> Notify me when this is done
> Send a notification saying the build is complete
> Alert me with "Meeting in 5 minutes"
```

## Platform Requirements

- **macOS**: Built-in (uses `osascript`)
- **Windows**: Built-in (uses PowerShell)
- **Linux**: Requires `notify-send` (usually pre-installed)

## Example

```typescript
{
  "title": "Build Complete",
  "message": "Your project build finished successfully!",
  "urgency": "normal"
}
```

## License

MIT
