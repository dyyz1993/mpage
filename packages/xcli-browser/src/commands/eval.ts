import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
  handler: async (raw, ctx) => {
    const p = params.parse(raw);
    const result = await executePageCommand(ctx.page, 'evaluate', {
      expression: p.expression,
    });
    return ok(result);
  },
};
