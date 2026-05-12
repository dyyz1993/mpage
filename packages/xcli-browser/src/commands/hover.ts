import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'hover', {
      selector: p.selector,
      force: p.force,
      modifiers: p.modifiers,
    });
    return ok(result);
  },
};
