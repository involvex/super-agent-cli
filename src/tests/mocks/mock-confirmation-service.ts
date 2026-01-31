export interface ConfirmationResult {
  confirmed: boolean;
  feedback?: string;
}

export class MockConfirmationService {
  private sessionFlags: {
    fileOperations: boolean;
    bashCommands: boolean;
    allOperations: boolean;
  } = {
    fileOperations: false,
    bashCommands: false,
    allOperations: false,
  };
  private nextConfirmations: ConfirmationResult[] = [];
  private shouldFail: boolean = false;
  private failMessage: string = "Mock confirmation error";

  getSessionFlags() {
    return { ...this.sessionFlags };
  }

  async requestConfirmation(
    options: any,
    type: string,
  ): Promise<ConfirmationResult> {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }

    if (this.nextConfirmations.length > 0) {
      return this.nextConfirmations.shift()!;
    }

    return { confirmed: true };
  }

  setSessionFlags(flags: {
    fileOperations: boolean;
    bashCommands: boolean;
    allOperations: boolean;
  }): void {
    this.sessionFlags = { ...flags };
  }

  setNextConfirmation(result: ConfirmationResult): void {
    this.nextConfirmations.push(result);
  }

  setNextConfirmations(results: ConfirmationResult[]): void {
    this.nextConfirmations = [...results];
  }

  setShouldFail(
    shouldFail: boolean,
    message: string = "Mock confirmation error",
  ): void {
    this.shouldFail = shouldFail;
    this.failMessage = message;
  }

  reset(): void {
    this.sessionFlags = {
      fileOperations: false,
      bashCommands: false,
      allOperations: false,
    };
    this.nextConfirmations = [];
    this.shouldFail = false;
  }
}

let instance: MockConfirmationService | null = null;

export function getMockConfirmationService(): MockConfirmationService {
  if (!instance) {
    instance = new MockConfirmationService();
  }
  return instance;
}

export function resetMockConfirmationService(): void {
  instance = null;
}
