import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector (defaults to body)'),
  clean: z.boolean().default(false).describe('Remove Vue attrs and empty elements'),
  full: z.boolean().default(false).describe('Return full page HTML'),
});

export const htmlCommand: BrowserCommandDefinition<typeof params> = {
  name: 'html',
  description: 'Get page HTML content',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'html', {
      selector: p.selector,
      clean: p.clean,
    });
    return ok(result);
  },
};
