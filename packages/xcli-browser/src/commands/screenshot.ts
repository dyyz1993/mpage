import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element to screenshot'),
  fullPage: z.boolean().default(false).describe('Capture full scrollable page'),
  type: z.enum(['png', 'jpeg']).default('png').describe('Image format'),
  quality: z.number().min(0).max(100).optional().describe('Image quality (jpeg only)'),
});

export const screenshotCommand: BrowserCommandDefinition<typeof params> = {
  name: 'screenshot',
  description: 'Take a screenshot of the page or element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'screenshotBase64', {
      selector: p.selector,
      fullPage: p.fullPage,
      type: p.type,
      quality: p.quality,
    });
    return ok(result);
  },
};
