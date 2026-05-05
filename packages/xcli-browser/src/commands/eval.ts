import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  expression: z.string().describe('JavaScript expression to evaluate'),
  arg: z.unknown().optional().describe('Argument to pass to the function'),
});

export const evalCommand: BrowserCommandDefinition<typeof params> = {
  name: 'eval',
  description: 'Evaluate JavaScript expression in the browser',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await ctx.page.evaluate(p.expression, p.arg);
    return ok({ result });
  },
};
