import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const getLocalStorageCommand: BrowserCommandDefinition = {
  name: 'getLocalStorage',
  description: 'Get all localStorage entries',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'getLocalStorage', {});
    return ok(result);
  },
};

const setLocalStorageParams = z.object({
  key: z.string().describe('Storage key'),
  value: z.string().describe('Storage value'),
});

export const setLocalStorageCommand: BrowserCommandDefinition<typeof setLocalStorageParams> = {
  name: 'setLocalStorage',
  description: 'Set a localStorage entry',
  scope: 'page',
  parameters: setLocalStorageParams,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'setLocalStorage', {
      key: p.key,
      value: p.value,
    });
    return ok(result);
  },
};

export const clearLocalStorageCommand: BrowserCommandDefinition = {
  name: 'clearLocalStorage',
  description: 'Clear all localStorage entries',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'clearLocalStorage', {});
    return ok(result);
  },
};
