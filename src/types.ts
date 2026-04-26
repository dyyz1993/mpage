export interface SessionInfo {
  name: string;
  cdpEndpoint: string;
  pid: number;
  serverPid: number;
  socketPath: string;
  isCDP: boolean;
  createdAt: number;
  lastUsed: number;
}

export interface CommandResult {
  success: boolean;
  content?: unknown;
  error?: string;
  tips?: string;
}

export interface CommandDefinition {
  schema: ZodSchema;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type ZodSchema = import('zod').ZodType<unknown>;
