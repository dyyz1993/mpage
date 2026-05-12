import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const getCookiesCommand: BrowserCommandDefinition = {
  name: 'getCookies',
  description: 'Get all cookies for the current page',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'getCookies', {});
    return ok(result);
  },
};

const setCookieParams = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().default('/').describe('Cookie path'),
  expires: z.number().optional().describe('Expiry timestamp'),
  httpOnly: z.boolean().default(false).describe('HTTP only'),
  secure: z.boolean().default(false).describe('Secure only'),
  sameSite: z.enum(['Strict', 'Lax', 'None']).default('Lax').describe('SameSite policy'),
});

export const setCookieCommand: BrowserCommandDefinition<typeof setCookieParams> = {
  name: 'setCookie',
  description: 'Set a cookie',
  scope: 'page',
  parameters: setCookieParams,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'setCookie', p);
    return ok(result);
  },
};

export const clearCookiesCommand: BrowserCommandDefinition = {
  name: 'clearCookies',
  description: 'Clear all cookies',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'clearCookies', {});
    return ok(result);
  },
};
