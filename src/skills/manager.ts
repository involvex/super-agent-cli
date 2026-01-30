import { getSettingsManager } from "../utils/settings-manager";
import { SuperAgent } from "../agent/super-agent";
import fs from "fs/promises";
import path from "path";

export interface Skill {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any) => Promise<any>;
}

export class SkillsManager {
  private static instance: SkillsManager;
  private skillsPath: string;

  private constructor() {
    this.skillsPath = path.join(
      getSettingsManager().getStorageDirectory(),
      "skills",
    );
  }

  static getInstance(): SkillsManager {
    if (!SkillsManager.instance) {
      SkillsManager.instance = new SkillsManager();
    }
    return SkillsManager.instance;
  }

  async ensureSkillsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.skillsPath, { recursive: true });
    } catch (error) {
      // Ignore if exists
    }
  }

  async listSkills(): Promise<string[]> {
    await this.ensureSkillsDirectory();
    try {
      const files = await fs.readdir(this.skillsPath);
      return files
        .filter(
          file =>
            file.endsWith(".ts") ||
            file.endsWith(".js") ||
            file.endsWith(".json"),
        )
        .map(file => path.parse(file).name);
    } catch (error) {
      return [];
    }
  }

  async getSkillPath(name: string): Promise<string> {
    // Check for TS, JS, or JSON
    const extensions = [".ts", ".js", ".json"];
    for (const ext of extensions) {
      const fullPath = path.join(this.skillsPath, `${name}${ext}`);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        continue;
      }
    }
    throw new Error(`Skill '${name}' not found`);
  }

  async getSkillContent(name: string): Promise<string> {
    const skillPath = await this.getSkillPath(name);
    return await fs.readFile(skillPath, "utf-8");
  }

  async createSkill(
    name: string,
    description: string,
    agent: SuperAgent,
  ): Promise<void> {
    await this.ensureSkillsDirectory();

    // AI generation logic here
    const prompt = `Create a robust TypeScript skill for the Super Agent CLI named "${name}".
    
    Description: ${description}
    
    The skill should be a module that exports a default function or class that implements the desired functionality.
    It should valid standalone TypeScript code.
    Include comments explaining how it works.
    
    Structure:
    \`\`\`typescript
    // ${name} skill
    export default async function(args: any) {
      // implementation
    }
    \`\`\`
    
    Return ONLY the code block.`;

    const response = await agent.processUserMessage(prompt);
    let code = "";

    for (const entry of response) {
      if (entry.type === "assistant") {
        const match = entry.content.match(
          /```(?:typescript|ts)?\n([\s\S]*?)```/,
        );
        if (match) {
          code = match[1];
          break;
        } else {
          code = entry.content; // Fallback if not in code block
        }
      }
    }

    if (!code) {
      throw new Error("Failed to generate skill code");
    }

    const filePath = path.join(this.skillsPath, `${name}.ts`);
    await fs.writeFile(filePath, code);
  }

  async deleteSkill(name: string): Promise<void> {
    try {
      const skillPath = await this.getSkillPath(name);
      await fs.unlink(skillPath);
    } catch (error) {
      throw new Error(
        `Failed to delete skill '${name}': ${(error as Error).message}`,
      );
    }
  }
  async saveSkill(name: string, content: string): Promise<void> {
    await this.ensureSkillsDirectory();
    const filePath = path.join(
      this.skillsPath,
      name.endsWith(".ts") ? name : `${name}.ts`,
    );
    await fs.writeFile(filePath, content);
  }
}
