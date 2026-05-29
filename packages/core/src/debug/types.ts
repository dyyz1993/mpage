import type { z } from 'zod/v4';

export interface CommandDef {
  parameters: z.ZodType;
  result?: z.ZodType;
}

export type CommandDefs = Record<string, CommandDef>;

export type InferCommandMap<T extends CommandDefs> = {
  [K in keyof T]: {
    params: z.infer<T[K]['parameters']>;
    result: T[K] extends { result: z.ZodType } ? z.infer<T[K]['result']> : unknown;
  };
};

export function defineCommands<T extends CommandDefs>(defs: T): T {
  return defs;
}
