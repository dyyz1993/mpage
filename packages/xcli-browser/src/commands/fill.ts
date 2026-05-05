import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Element selector'),
  value: z.string().describe('Value to fill'),
  clear: z.boolean().default(true).describe('Clear field before filling'),
  force: z.boolean().default(false).describe('Skip actionability checks'),
});

export const fillCommand: BrowserCommandDefinition<typeof params> = {
  name: 'fill',
  description: 'Fill an input field with a value',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.clear) {
      await ctx.page.fill(p.selector, '', { force: p.force });
    }
    await ctx.page.fill(p.selector, p.value, { force: p.force });
    return ok({ selector: p.selector, value: p.value });
  },
};
