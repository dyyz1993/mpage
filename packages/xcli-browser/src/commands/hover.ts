import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Element selector'),
  force: z.boolean().default(false).describe('Skip actionability checks'),
  modifiers: z
    .array(z.enum(['Alt', 'Control', 'Meta', 'Shift']))
    .default([])
    .describe('Modifier keys to hold'),
});

export const hoverCommand: BrowserCommandDefinition<typeof params> = {
  name: 'hover',
  description: 'Hover over an element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    await ctx.page.hover(p.selector, { force: p.force, modifiers: p.modifiers });
    return ok({ selector: p.selector });
  },
};
