import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const forwardCommand: BrowserCommandDefinition = {
  name: 'forward',
  description: 'Go forward in browser history',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'goForward', {});
    return ok(result);
  },
};
