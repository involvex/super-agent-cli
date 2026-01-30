import type {
  PluginContext,
  SuperAgentPlugin,
  SuperAgentTool,
} from "@involvex/super-agent-cli/@plugins/shared/types";

// Example tool that demonstrates the basic plugin pattern
const exampleTool: SuperAgentTool = {
  type: "function",
  function: {
    name: "example_tool",
    description:
      "An example tool that demonstrates basic plugin functionality. Replace this with your own tool implementation.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "A message to process",
        },
      },
      required: ["message"],
    },
    executor: async (args: { message: string }) => {
      try {
        // Validate input
        if (!args.message || typeof args.message !== "string") {
          return "Error: Message must be a non-empty string.";
        }

        // Your tool logic here
        return `Processed: ${args.message}`;
      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    },
  },
};

export const plugin: SuperAgentPlugin = {
  name: "my-plugin",
  version: "1.0.0",
  description: "A basic Super Agent plugin template",
  tools: [exampleTool],

  async onInit(context: PluginContext) {
    // Initialize your plugin here
    // Access configuration via context.config
    console.log("Plugin initialized!");
  },

  async onShutdown() {
    // Clean up resources if needed
  },
};

export default plugin;
