import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector'),
});

export const textCommand: BrowserCommandDefinition<typeof params> = {
  name: 'text',
  description: 'Get text content of the page or an element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'text', {
      selector: p.selector,
    });
    return ok(result);
  },
};
