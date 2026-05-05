import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  timeout: z.number().default(1000).describe('Wait time in milliseconds'),
});

export const waitForTimeoutCommand: BrowserCommandDefinition<typeof params> = {
  name: 'waitForTimeout',
  description: 'Wait for a specified duration',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    await ctx.page.waitForTimeout(p.timeout);
    return ok({ waited: p.timeout });
  },
};
