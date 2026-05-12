import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'wait', {
      timeout: p.timeout,
    });
    return ok(result);
  },
};
