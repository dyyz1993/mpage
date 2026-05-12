import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Element selector'),
  button: z.enum(['left', 'right', 'middle']).default('left').describe('Mouse button'),
  clickCount: z.number().default(1).describe('Number of clicks'),
  delay: z.number().default(0).describe('Delay between mousedown and mouseup (ms)'),
  force: z.boolean().default(false).describe('Skip actionability checks'),
});

export const clickCommand: BrowserCommandDefinition<typeof params> = {
  name: 'click',
  description: 'Click an element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'click', {
      selector: p.selector,
      button: p.button,
      clickCount: p.clickCount,
      delay: p.delay,
      force: p.force,
    });
    return ok(result);
  },
};
