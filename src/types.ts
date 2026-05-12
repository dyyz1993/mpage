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

export type CommandResult =
  | { success: true; content?: unknown; tips?: string[] }
  | { success: false; error: string; content?: unknown; tips?: string[] };

export interface CommandDefinition {
  schema: ZodSchema;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type ZodSchema = import('zod/v4').ZodType<unknown>;
