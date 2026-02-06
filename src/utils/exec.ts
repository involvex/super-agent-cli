import { spawn } from "child_process";

/**
 * Options for executing a command
 */
export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

/**
 * Result of a command execution
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Safely execute a command using child_process.spawn.
 * This avoids shell injection vulnerabilities by passing arguments as an array
 * and disabling shell execution by default.
 */
export async function runSafeCommand(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      shell: false, // Disabling shell execution prevents injection
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", data => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", data => {
        stderr += data.toString();
      });
    }

    if (options.input && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(
          `Command "${command} ${args.join(" ")}" failed with exit code ${code}.
Stderr: ${stderr}`,
        );
        (error as any).code = code;
        (error as any).stdout = stdout;
        (error as any).stderr = stderr;
        reject(error);
      }
    });

    child.on("error", err => {
      reject(err);
    });
  });
}
