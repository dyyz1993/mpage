import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const refreshCommand: BrowserCommandDefinition = {
  name: 'refresh',
  description: 'Refresh the current page',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'reload', {});
    return ok(result);
  },
};
