# Weather Plugin

Get weather information for any city using the OpenWeatherMap API.

## Features

- Current weather conditions
- Temperature in Celsius/Fahrenheit
- Humidity, wind speed, and conditions
- Simple, single-tool example

## Installation

```bash
super-agent plugins install @plugins/examples/weather
```

## Configuration

Add your API key to `~/.super-agent/settings.json`:

```json
{
  "plugins": ["@plugins/examples/weather"],
  "pluginConfigs": {
    "weather": {
      "apiKey": "your-openweathermap-api-key",
      "units": "metric"
    }
  }
}
```

Get a free API key at [OpenWeatherMap](https://openweathermap.org/api).

## Usage

Simply ask Super Agent about the weather:

```
> What's the weather in London?
> Is it raining in Tokyo?
> What's the temperature in New York?
```

## Implementation Details

This plugin demonstrates:

- **External API integration** - Makes HTTP requests to OpenWeatherMap
- **Configuration handling** - Reads API key from plugin config
- **Error handling** - Gracefully handles API errors and missing config
- **Parameter validation** - Validates city name input

## Code Structure

```
weather/
├── src/
│   └── index.ts       # Main plugin code
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
└── README.md          # This file
```

## Development

```bash
npm install
npm run build
npm run dev   # Watch mode
```

## License

MIT
