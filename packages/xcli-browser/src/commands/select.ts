import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'select', {
      selector: p.selector,
      value: p.value,
    });
    return ok(result);
  },
};
