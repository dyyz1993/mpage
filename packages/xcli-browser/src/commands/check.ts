import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'check', {
      selector: p.selector,
      checked: p.checked,
      force: p.force,
    });
    return ok(result);
  },
};
