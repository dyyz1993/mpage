import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector (defaults to body)'),
  full: z.boolean().default(false).describe('Return full page HTML'),
});

export const htmlCommand: BrowserCommandDefinition<typeof params> = {
  name: 'html',
  description: 'Get page HTML content',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.selector) {
      const element = ctx.page.locator(p.selector).first();
      const html = await element.innerHTML();
      return ok({ html });
    }
    const html = await ctx.page.content();
    return ok({ html });
  },
};
