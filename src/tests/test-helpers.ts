import type { MockFileSystem } from "./mocks/mock-file-system";
import { getMockFileSystem } from "./mocks/mock-file-system";
import { expect } from "vitest";
import * as path from "path";

export async function withTempDir(
  callback: (tempDir: string) => Promise<void> | void,
): Promise<void> {
  const tempDir = path.join(process.cwd(), `temp-test-${Date.now()}`);
  try {
    await callback(tempDir);
  } finally {
    await cleanupTempDir(tempDir);
  }
}

async function cleanupTempDir(dirPath: string): Promise<void> {
  const fs = await import("fs-extra");
  if (await fs.pathExists(dirPath)) {
    await fs.remove(dirPath);
  }
}

export function createTestFile(
  mockFs: MockFileSystem,
  filePath: string,
  content: string,
): void {
  mockFs.setFile(filePath, content);
}

export function assertToolResultSuccess(
  result: any,
  expectedOutput?: string,
): void {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  if (expectedOutput !== undefined) {
    expect(result.output).toContain(expectedOutput);
  }
}

export function assertToolResultFailure(
  result: any,
  expectedError?: string,
): void {
  expect(result).toBeDefined();
  expect(result.success).toBe(false);
  if (expectedError !== undefined) {
    expect(result.error).toContain(expectedError);
  }
}

export function assertEqualWithTolerance(
  actual: number,
  expected: number,
  tolerance: number = 0.01,
): void {
  const diff = Math.abs(actual - expected);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitFor<T>(
  condition: () => T | undefined,
  timeout: number = 5000,
  interval: number = 100,
): Promise<T> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const result = condition();
    if (result !== undefined) {
      return result;
    }
    await delay(interval);
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

export function createMockConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  return {
    logs,
    errors,
    warns,
    log: (...args: any[]) => logs.push(args.join(" ")),
    error: (...args: any[]) => errors.push(args.join(" ")),
    warn: (...args: any[]) => warns.push(args.join(" ")),
    reset: () => {
      logs.length = 0;
      errors.length = 0;
      warns.length = 0;
    },
  };
}

export function setupMockFileSystem(): MockFileSystem {
  const mockFs = getMockFileSystem();
  mockFs.reset();
  mockFs.setFile("/test/file.txt", "Hello, World!");
  mockFs.setFile("/test/nested/file.js", "console.log('test');");
  mockFs.mkdir("/test/empty-dir");
  return mockFs;
}

export function createMockProcess(cwd: string = process.cwd()) {
  return {
    cwd: () => cwd,
    chdir: (dir: string) => {},
    env: process.env,
  };
}
