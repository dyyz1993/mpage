import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const titleCommand: BrowserCommandDefinition = {
  name: 'title',
  description: 'Get the page title',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'title', {});
    return ok(result);
  },
};
