import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const getLocalStorageCommand: BrowserCommandDefinition = {
  name: 'getLocalStorage',
  description: 'Get all localStorage entries',
  scope: 'page',
  handler: async (_p, ctx) => {
    const data = await ctx.page.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          entries[key] = localStorage.getItem(key) ?? '';
        }
      }
      return entries;
    });
    return ok({ data });
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
    await ctx.page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: p.key, value: p.value }
    );
    return ok({ key: p.key });
  },
};

export const clearLocalStorageCommand: BrowserCommandDefinition = {
  name: 'clearLocalStorage',
  description: 'Clear all localStorage entries',
  scope: 'page',
  handler: async (_p, ctx) => {
    await ctx.page.evaluate(() => {
      localStorage.clear();
    });
    return ok({ cleared: true });
  },
};
