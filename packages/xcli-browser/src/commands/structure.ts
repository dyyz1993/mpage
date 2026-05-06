import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().default('body').describe('Root selector to analyze'),
  maxDepth: z.number().default(5).describe('Maximum depth of structure tree'),
});

export const structureCommand: BrowserCommandDefinition<typeof params> = {
  name: 'structure',
  description: 'Get the DOM structure of the page or an element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'structure', {
      selector: p.selector,
    });
    return ok(result);
  },
};
