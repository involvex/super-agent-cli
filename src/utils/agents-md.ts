/**
 * Agents.md file management for project-specific AI instructions
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export interface AgentsMdOptions {
  projectName?: string;
  description?: string;
  techStack?: string[];
  conventions?: string[];
  customInstructions?: string;
}

const DEFAULT_AGENTS_MD_TEMPLATE = `# Project Instructions for AI Agent

This file contains project-specific instructions for the Super Agent CLI to follow when assisting with this project.

## Project Overview

<!-- Add your project description here -->
- **Project Name**: {{PROJECT_NAME}}
- **Description**: {{DESCRIPTION}}

## Tech Stack

<!-- List the main technologies and frameworks used -->
{{TECH_STACK}}

## Development Conventions

<!-- Add coding standards and conventions specific to this project -->
{{CONVENTIONS}}

## Custom Instructions

{{CUSTOM_INSTRUCTIONS}}

---

## Tips for Adding Instructions

1. **Be Specific**: Clear, specific instructions help the AI agent provide better assistance
2. **Include Examples**: Show code examples of preferred patterns
3. **State Preferences**: Whether you prefer certain libraries, patterns, or approaches
4. **Update Regularly**: Keep this file updated as the project evolves

## Example Sections You Can Add

### File Structure
\`\`\`
src/
├── components/    # React components
├── utils/         # Utility functions
└── types/         # TypeScript type definitions
\`\`\`

### Coding Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Write tests for all new functions

### Preferred Patterns
- Use async/await over promises
- Prefer functional components over class components
- Use named exports for better debugging
`;

/**
 * Generate Agents.md content from options
 */
export function generateAgentsMdContent(options: AgentsMdOptions = {}): string {
  let content = DEFAULT_AGENTS_MD_TEMPLATE;

  // Replace project name
  content = content.replace(
    "{{PROJECT_NAME}}",
    options.projectName || path.basename(process.cwd()),
  );

  // Replace description
  content = content.replace(
    "{{DESCRIPTION}}",
    options.description ||
      "Add a brief description of what this project does and its main purpose.",
  );

  // Replace tech stack
  const techStack =
    options.techStack && options.techStack.length > 0
      ? options.techStack.map(tech => `- ${tech}`).join("\n")
      : `- TypeScript
- Node.js/Bun
- React (if applicable)
- Add your technologies here`;
  content = content.replace("{{TECH_STACK}}", techStack);

  // Replace conventions
  const conventions =
    options.conventions && options.conventions.length > 0
      ? options.conventions.map(conv => `- ${conv}`).join("\n")
      : `- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Document public APIs`;
  content = content.replace("{{CONVENTIONS}}", conventions);

  // Replace custom instructions
  content = content.replace(
    "{{CUSTOM_INSTRUCTIONS}}",
    options.customInstructions ||
      "Add any specific instructions or guidelines for the AI agent to follow when working on this project.",
  );

  return content;
}

/**
 * Create Agents.md file in the current working directory
 */
export async function createAgentsMd(
  options: AgentsMdOptions = {},
): Promise<{ success: boolean; path?: string; error?: string }> {
  const agentsMdPath = path.join(process.cwd(), "Agents.md");

  try {
    // Check if file already exists
    if (await fs.pathExists(agentsMdPath)) {
      return {
        success: false,
        error: `Agents.md already exists at ${agentsMdPath}`,
      };
    }

    // Generate content
    const content = generateAgentsMdContent(options);

    // Write file
    await fs.writeFile(agentsMdPath, content, "utf-8");

    return {
      success: true,
      path: agentsMdPath,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to create Agents.md: ${error.message}`,
    };
  }
}

/**
 * Read existing Agents.md file
 */
export async function readAgentsMd(): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  const agentsMdPath = path.join(process.cwd(), "Agents.md");

  try {
    if (!(await fs.pathExists(agentsMdPath))) {
      return {
        success: false,
        error: "No Agents.md file found in current directory",
      };
    }

    const content = await fs.readFile(agentsMdPath, "utf-8");

    return {
      success: true,
      content,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read Agents.md: ${error.message}`,
    };
  }
}

/**
 * Check if Agents.md exists in current directory
 */
export async function agentsMdExists(): Promise<boolean> {
  const agentsMdPath = path.join(process.cwd(), "Agents.md");
  return fs.pathExists(agentsMdPath);
}
