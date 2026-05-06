import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'press', {
      key: p.key,
      selector: p.selector,
      delay: p.delay,
    });
    return ok(result);
  },
};
