import type {
  PluginContext,
  SuperAgentPlugin,
  SuperAgentTool,
} from "../../shared/types";

interface WeatherConfig {
  apiKey?: string;
  units?: "metric" | "imperial";
}

let config: WeatherConfig = {};

const getWeatherTool: SuperAgentTool = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get current weather information for a city. Use this when the user asks about weather conditions, temperature, or forecast.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Name of the city (e.g., 'London', 'New York', 'Tokyo')",
        },
        country: {
          type: "string",
          description:
            "Optional 2-letter country code (e.g., 'US', 'GB', 'JP')",
        },
      },
      required: ["city"],
    },
    executor: async (args: { city: string; country?: string }) => {
      try {
        // Validate API key
        if (!config.apiKey) {
          return "Error: Weather API key not configured. Please add your OpenWeatherMap API key to the plugin configuration.";
        }

        // Validate input
        if (!args.city || typeof args.city !== "string") {
          return "Error: City name is required and must be a string.";
        }

        // Build query
        const query = args.country ? `${args.city},${args.country}` : args.city;

        const units = config.units || "metric";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${config.apiKey}&units=${units}`;

        // Make API request
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            return `Error: City "${args.city}" not found. Please check the spelling.`;
          }
          if (response.status === 401) {
            return "Error: Invalid API key. Please check your OpenWeatherMap API key.";
          }
          return `Error: Weather API returned status ${response.status}`;
        }

        const data = await response.json();

        // Format response
        const tempUnit = units === "metric" ? "°C" : "°F";
        const speedUnit = units === "metric" ? "m/s" : "mph";

        return `Weather in ${data.name}, ${data.sys.country}:
- Conditions: ${data.weather[0].description}
- Temperature: ${data.main.temp}${tempUnit} (feels like ${data.main.feels_like}${tempUnit})
- Humidity: ${data.main.humidity}%
- Wind: ${data.wind.speed} ${speedUnit}
- Pressure: ${data.main.pressure} hPa`;
      } catch (error: any) {
        return `Error fetching weather data: ${error.message}`;
      }
    },
  },
};

export const plugin: SuperAgentPlugin = {
  name: "weather",
  version: "1.0.0",
  description:
    "Get current weather information for any city using OpenWeatherMap API",
  tools: [getWeatherTool],

  async onInit(context: PluginContext) {
    config = context.config || {};

    if (!config.apiKey) {
      console.warn(
        "⚠️  Weather plugin: No API key configured. Get one at https://openweathermap.org/api",
      );
    }
  },

  async onShutdown() {
    // Clean up if needed
  },
};

export default plugin;
