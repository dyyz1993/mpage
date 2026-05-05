import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Select element selector'),
  value: z.string().describe('Value(s) to select'),
});

export const selectCommand: BrowserCommandDefinition<typeof params> = {
  name: 'select',
  description: 'Select option(s) in a <select> element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const values = await ctx.page.selectOption(p.selector, p.value);
    return ok({ selector: p.selector, selectedValues: values });
  },
};
