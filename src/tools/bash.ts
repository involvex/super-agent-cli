import { ConfirmationService } from "../utils/confirmation-service";
import { ToolResult } from "../types/index";
import { spawn } from "child_process";
import { promisify } from "util";
import * as shellQuote from "shell-quote";

const promisifyFn = promisify; // kept in case other parts of this file evolve to use promisify

export class BashTool {
  private currentDirectory: string = process.cwd();
  private confirmationService = ConfirmationService.getInstance();

  private async runCommandSafely(
    command: string,
    options: { cwd?: string; timeout?: number; maxBuffer?: number },
  ): Promise<{ stdout: string; stderr: string }> {
    const parsed = shellQuote.parse(command);
    const argv = parsed
      .filter(token => typeof token === "string")
      .map(token => token as string);

    if (argv.length === 0) {
      return { stdout: "", stderr: "" };
    }

    const cmd = argv[0];
    const args = argv.slice(1);

    return await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      const maxBuffer = options.maxBuffer ?? 1024 * 1024;
      const timeout = options.timeout ?? 30000;

      let killedForTimeout = false;
      let killedForBuffer = false;

      const timer = setTimeout(() => {
        killedForTimeout = true;
        child.kill();
      }, timeout);

      child.stdout?.on("data", (data: Buffer | string) => {
        const chunk = data.toString();
        if (stdout.length + chunk.length > maxBuffer) {
          killedForBuffer = true;
          child.kill();
          return;
        }
        stdout += chunk;
      });

      child.stderr?.on("data", (data: Buffer | string) => {
        const chunk = data.toString();
        if (stderr.length + chunk.length > maxBuffer) {
          killedForBuffer = true;
          child.kill();
          return;
        }
        stderr += chunk;
      });

      child.on("error", error => {
        clearTimeout(timer);
        reject(error);
      });

      child.on("close", code => {
        clearTimeout(timer);
        if (killedForTimeout) {
          return reject(new Error("Command timed out"));
        }
        if (killedForBuffer) {
          return reject(new Error("Command output exceeded buffer limit"));
        }
        resolve({ stdout, stderr });
      });
    });
  }

  async execute(command: string, timeout: number = 30000): Promise<ToolResult> {
    try {
      // Check if user has already accepted bash commands for this session
      const sessionFlags = this.confirmationService.getSessionFlags();
      if (!sessionFlags.bashCommands && !sessionFlags.allOperations) {
        // Request confirmation showing the command
        const confirmationResult =
          await this.confirmationService.requestConfirmation(
            {
              operation: "Run bash command",
              filename: command,
              showVSCodeOpen: false,
              content: `Command: ${command}\nWorking directory: ${this.currentDirectory}`,
            },
            "bash",
          );

        if (!confirmationResult.confirmed) {
          return {
            success: false,
            error:
              confirmationResult.feedback ||
              "Command execution cancelled by user",
          };
        }
      }

      if (command.startsWith("cd ")) {
        const newDir = command.substring(3).trim();
        try {
          process.chdir(newDir);
          this.currentDirectory = process.cwd();
          return {
            success: true,
            output: `Changed directory to: ${this.currentDirectory}`,
          };
        } catch (error: any) {
          return {
            success: false,
            error: `Cannot change directory: ${error.message}`,
          };
        }
      }

      const { stdout, stderr } = await this.runCommandSafely(command, {
        cwd: this.currentDirectory,
        timeout,
        maxBuffer: 1024 * 1024,
      });

      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : "");

      return {
        success: true,
        output: output.trim() || "Command executed successfully (no output)",
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Command failed: ${error.message}`,
      };
    }
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  async listFiles(directory: string = "."): Promise<ToolResult> {
    return this.execute(`ls -la ${directory}`);
  }

  async findFiles(
    pattern: string,
    directory: string = ".",
  ): Promise<ToolResult> {
    return this.execute(`find ${directory} -name "${pattern}" -type f`);
  }

  async grep(pattern: string, files: string = "."): Promise<ToolResult> {
    return this.execute(`grep -r "${pattern}" ${files}`);
  }
}
