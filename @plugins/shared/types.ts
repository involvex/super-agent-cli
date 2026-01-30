export interface PluginContext {
  agent: any; // SuperAgent instance
  config: any; // Plugin-specific configuration
}

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

export interface SuperAgentPlugin {
  name: string;
  version: string;
  description?: string;
  tools?: SuperAgentTool[];
  onInit?: (context: PluginContext) => Promise<void>;
  onShutdown?: () => Promise<void>;
}
