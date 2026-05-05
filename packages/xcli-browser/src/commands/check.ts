import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Checkbox or radio selector'),
  checked: z.boolean().default(true).describe('Check or uncheck'),
  force: z.boolean().default(false).describe('Skip actionability checks'),
});

export const checkCommand: BrowserCommandDefinition<typeof params> = {
  name: 'check',
  description: 'Check or uncheck a checkbox or radio button',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.checked) {
      await ctx.page.check(p.selector, { force: p.force });
    } else {
      await ctx.page.uncheck(p.selector, { force: p.force });
    }
    return ok({ selector: p.selector, checked: p.checked });
  },
};
