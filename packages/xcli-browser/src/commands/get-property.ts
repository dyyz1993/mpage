import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector'),
  property: z
    .enum([
      'text',
      'innerHTML',
      'outerHTML',
      'value',
      'checked',
      'disabled',
      'href',
      'src',
      'alt',
      'title',
      'placeholder',
      'tagName',
      'id',
      'className',
    ])
    .describe('Property to get'),
});

export const getPropertyCommand: BrowserCommandDefinition<typeof params> = {
  name: 'getProperty',
  description: 'Get a property value from an element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'getProperty', {
      selector: p.selector,
      property: p.property,
    });
    return ok(result);
  },
};
