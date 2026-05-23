import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().default('body').describe('Root selector'),
  interactiveOnly: z.boolean().default(false).describe('Only interactive elements'),
});

export const snapshotCommand: BrowserCommandDefinition<typeof params> = {
  name: 'snapshot',
  description: 'Get a snapshot of page elements',
  scope: 'page',
  parameters: params,
  handler: async (raw, ctx) => {
    const p = params.parse(raw);
    const result = await executePageCommand(ctx.page, 'a11y', {
      selector: p.selector,
      format: 'yaml',
    });
    return ok(result);
  },
};
