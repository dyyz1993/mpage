import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Element selector'),
  text: z.string().describe('Text to type'),
  delay: z.number().default(50).describe('Delay between keystrokes (ms)'),
  clear: z.boolean().default(false).describe('Clear field before typing'),
});

export const typeCommand: BrowserCommandDefinition<typeof params> = {
  name: 'type',
  description: 'Type text into an element (character by character)',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'type', {
      selector: p.selector,
      text: p.text,
      delay: p.delay,
      clear: p.clear,
    });
    return ok(result);
  },
};
