import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import fs from "fs/promises";
import path from "path";

export interface AgentConfig {
  name: string;
  role: string;
  description: string;
  model?: string;
  tools?: string[]; // Allowed tools/skills
  temperature?: number;
  systemPrompt?: string;
}

export class AgentsManager {
  private static instance: AgentsManager;
  private agentsPath: string;

  private constructor() {
    this.agentsPath = path.join(
      getSettingsManager().getStorageDirectory(),
      "agents",
    );
  }

  static getInstance(): AgentsManager {
    if (!AgentsManager.instance) {
      AgentsManager.instance = new AgentsManager();
    }
    return AgentsManager.instance;
  }

  async ensureAgentsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.agentsPath, { recursive: true });
    } catch (error) {
      // Ignore if exists
    }
  }

  async listAgents(): Promise<AgentConfig[]> {
    await this.ensureAgentsDirectory();
    try {
      const files = await fs.readdir(this.agentsPath);
      const agents: AgentConfig[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const content = await fs.readFile(
              path.join(this.agentsPath, file),
              "utf-8",
            );
            agents.push(JSON.parse(content));
          } catch (e) {
            // Skip invalid files
          }
        }
      }
      return agents;
    } catch (error) {
      return [];
    }
  }

  async getAgent(name: string): Promise<AgentConfig | null> {
    try {
      const content = await fs.readFile(
        path.join(this.agentsPath, `${name}.json`),
        "utf-8",
      );
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async createAgent(config: AgentConfig): Promise<void> {
    await this.ensureAgentsDirectory();
    const filePath = path.join(this.agentsPath, `${config.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
  }

  async generateAgent(
    name: string,
    description: string,
    agent: SuperAgent,
  ): Promise<void> {
    // Use AI to generate agent configuration based on description
    const prompt = `Create a configuration for an AI agent named "${name}" based on this description: "${description}".
    
    The configuration should be a JSON object matching this interface:
    interface AgentConfig {
      name: string;
      role: string;
      description: string;
      model?: string; // suggest a model if appropriate, or leave undefined
      tools?: string[]; // suggest relevant tools/skills names
      temperature?: number;
      systemPrompt?: string; // a detailed system prompt for this agent
    }
    
    Return ONLY the JSON object.`;

    const response = await agent.processUserMessage(prompt);
    let jsonData = "";

    for (const entry of response) {
      if (entry.type === "assistant") {
        const match = entry.content.match(/```(?:json)?\n([\s\S]*?)```/);
        if (match) {
          jsonData = match[1];
          break;
        } else {
          // Try to parse the whole content if it looks like JSON
          if (entry.content.trim().startsWith("{")) {
            jsonData = entry.content;
          }
        }
      }
    }

    if (!jsonData) {
      throw new Error("Failed to generate agent configuration");
    }

    try {
      const config = JSON.parse(jsonData);
      // Ensure name matches
      config.name = name;
      await this.createAgent(config);
    } catch (e) {
      throw new Error(
        `Failed to parse generated agent config: ${(e as Error).message}`,
      );
    }
  }

  async deleteAgent(name: string): Promise<void> {
    try {
      const filePath = path.join(this.agentsPath, `${name}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete agent '${name}'`);
    }
  }
}
