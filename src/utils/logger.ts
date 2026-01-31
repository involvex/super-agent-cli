/**
 * Simple debug logger utility
 * Only logs when debug mode is enabled
 */

class Logger {
  private debugMode: boolean = false;
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public isDebugEnabled(): boolean {
    return this.debugMode;
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] [INFO] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
  }

  public trace(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.trace(`[${timestamp}] [TRACE] ${message}`, ...args);
    }
  }
}

export function getLogger(): Logger {
  return Logger.getInstance();
}

export { Logger };
