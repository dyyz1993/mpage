import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'fill', {
      selector: p.selector,
      value: p.value,
      clear: p.clear,
      force: p.force,
    });
    return ok(result);
  },
};
