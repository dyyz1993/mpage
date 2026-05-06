import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const backCommand: BrowserCommandDefinition = {
  name: 'back',
  description: 'Go back in browser history',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'goBack', {});
    return ok(result);
  },
};
