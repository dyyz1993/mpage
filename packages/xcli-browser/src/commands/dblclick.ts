import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Element selector'),
  button: z.enum(['left', 'right', 'middle']).default('left').describe('Mouse button'),
  delay: z.number().default(0).describe('Delay between clicks (ms)'),
  force: z.boolean().default(false).describe('Skip actionability checks'),
});

export const dblclickCommand: BrowserCommandDefinition<typeof params> = {
  name: 'dblclick',
  description: 'Double-click an element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'dblclick', {
      selector: p.selector,
      button: p.button,
      delay: p.delay,
      force: p.force,
    });
    return ok(result);
  },
};
