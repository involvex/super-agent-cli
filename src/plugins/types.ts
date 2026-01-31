import { SuperAgent } from "../agent/super-agent";
import { SuperAgentTool } from "../types";

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

// Repository types for dynamic plugin system
export type RepositoryType = "agents" | "skills" | "hooks" | "mcp";

export interface RepositoryConfig {
  type: RepositoryType;
  url: string;
  branch?: string;
  localPath?: string;
}

export interface RepositoryItem {
  name: string;
  type: RepositoryType;
  path: string;
  description?: string;
  enabled: boolean;
  config?: any; // Item-specific config from config.json
}
