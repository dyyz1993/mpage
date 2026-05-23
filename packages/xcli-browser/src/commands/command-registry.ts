import type { ZodType } from 'zod/v4';
import type { CommandScope } from '@dyyz1993/xcli-core';
import type { BrowserCommandContext } from '../context.js';

export interface BrowserCommandDefinition<P = ZodType<unknown>> {
  name: string;
  description: string;
  scope: CommandScope;
  parameters?: P;
  result?: ZodType<unknown>;
  handler: (params: Record<string, unknown>, ctx: BrowserCommandContext) => Promise<unknown>;
}

export type RegisteredCommand = {
  readonly name: string;
  readonly description: string;
  readonly scope: CommandScope;
  readonly parameters?: ZodType<unknown>;
  readonly result?: ZodType<unknown>;
  readonly handler: (
    params: Record<string, unknown>,
    ctx: BrowserCommandContext
  ) => Promise<unknown>;
};

const registry = new Map<string, RegisteredCommand>();

export function registerCommand(cmd: RegisteredCommand): void {
  registry.set(cmd.name, cmd);
}

export function getCommand(name: string): RegisteredCommand | undefined {
  return registry.get(name);
}

export function getAllCommands(): RegisteredCommand[] {
  return Array.from(registry.values());
}

export function getCommandNames(): string[] {
  return Array.from(registry.keys());
}

export function clearRegistry(): void {
  registry.clear();
}
