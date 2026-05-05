import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  expression: z.string().describe('JavaScript expression to evaluate'),
  arg: z.unknown().optional().describe('Argument to pass'),
});

export const evaluateCommand: BrowserCommandDefinition<typeof params> = {
  name: 'evaluate',
  description: 'Evaluate a JavaScript expression in the page context',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await ctx.page.evaluate(
      // eslint-disable-next-line no-eval
      eval(`(${p.expression})`) as (arg: unknown) => unknown,
      p.arg
    );
    return ok({ result });
  },
};
