import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector'),
  attribute: z.string().optional().describe('Attribute name to get'),
});

export const textCommand: BrowserCommandDefinition<typeof params> = {
  name: 'text',
  description: 'Get text content of the page or an element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.selector) {
      const element = ctx.page.locator(p.selector).first();
      const text = await element.textContent();
      return ok({ text: text ?? '' });
    }
    const text = await ctx.page.textContent('body');
    return ok({ text: text ?? '' });
  },
};
