import type { Page } from 'playwright-core';
import type { CommandModule, PageContext } from './types.js';

function waitForTimeout(ctx: PageContext, ms: number): Promise<void> {
  if ((ctx as Page).waitForTimeout) return (ctx as Page).waitForTimeout(ms);
  return new Promise((r) => setTimeout(r, ms));
}

function waitForLoadState(ctx: PageContext, state: string): Promise<void> {
  return (ctx as Page).waitForLoadState(state as 'load' | 'domcontentloaded' | 'networkidle');
}

export const evaluateCommands: CommandModule = {
  evaluate: async (ctx: PageContext, args: Record<string, unknown>) => {
    if (typeof args.expression !== 'string') {
      throw new Error('evaluate: "expression" parameter is required and must be a string');
    }
    const result = await ctx.evaluate(args.expression);
    return { result };
  },

  evaluateRaw: async (ctx: PageContext, args: Record<string, unknown>) => {
    if (typeof args.script !== 'string') {
      throw new Error('evaluateRaw: "script" parameter is required and must be a string');
    }
    const wrapped = `(async () => { return ${args.script}; })()`;
    const result = await ctx.evaluate(wrapped);
    return { result };
  },

  wait: async (ctx: PageContext, args: Record<string, unknown>) => {
    if (args.state) {
      await waitForLoadState(ctx, args.state as string);
      return { state: args.state };
    }
    const timeout = (args.timeout as number) || 1000;
    await waitForTimeout(ctx, timeout);
    return { waited: timeout };
  },
};
