import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  url: z.string().describe('URL to navigate to'),
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
    .default('domcontentloaded')
    .describe('Wait condition'),
});

export const gotoCommand: BrowserCommandDefinition<typeof params> = {
  name: 'goto',
  description: 'Navigate to a URL',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'goto', {
      url: p.url,
      waitUntil: p.waitUntil,
    });
    return ok(result);
  },
};
