import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'evaluateRaw', {
      script: p.expression,
    });
    return ok(result);
  },
};
