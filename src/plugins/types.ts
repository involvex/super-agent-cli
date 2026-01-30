import { SuperAgent } from "../agent/super-agent";
import { SuperAgentTool } from "../core/client";

export interface PluginContext {
  agent: SuperAgent;
  config: any; // Type strictly later
}

export interface SuperAgentPlugin {
  name: string;
  version: string;
  description?: string;
  tools?: SuperAgentTool[];
  onInit?: (context: PluginContext) => Promise<void>;
  onShutdown?: () => Promise<void>;
}
