import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  key: z.string().describe('Key to press (e.g., Enter, Escape, Tab, ArrowDown)'),
  selector: z.string().optional().describe('Element selector (focuses element first)'),
  delay: z.number().default(0).describe('Delay after key press (ms)'),
});

export const pressCommand: BrowserCommandDefinition<typeof params> = {
  name: 'press',
  description: 'Press a keyboard key',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.selector) {
      await ctx.page.press(p.selector, p.key, { delay: p.delay });
    } else {
      await ctx.page.keyboard.press(p.key, { delay: p.delay });
    }
    return ok({ key: p.key });
  },
};
