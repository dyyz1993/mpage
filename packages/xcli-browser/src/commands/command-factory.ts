import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand, commands } from '@dyyz1993/xpage';
import type { RegisteredCommand } from './command-registry.js';
import type { BrowserCommandContext } from '../context.js';

type Scope = 'project' | 'browser' | 'page' | 'element';

const FACTORY_COMMANDS: Record<
  string,
  {
    scope: Scope;
    xpageCommand?: string;
    paramFilter?: string[];
  }
> = {
  goto: { scope: 'page' },
  click: { scope: 'element' },
  dblclick: { scope: 'element' },
  fill: { scope: 'element' },
  type: { scope: 'element' },
  press: { scope: 'page' },
  hover: { scope: 'element' },
  select: { scope: 'element' },
  check: { scope: 'element' },
  waitForSelector: { scope: 'page' },
  waitForTimeout: { scope: 'page', xpageCommand: 'wait' },
  mouse: { scope: 'page' },
  getProperty: { scope: 'element' },
  setViewport: { scope: 'browser', paramFilter: ['width', 'height'] },
  getCookies: { scope: 'page' },
  setCookie: { scope: 'page' },
  clearCookies: { scope: 'page' },
  getLocalStorage: { scope: 'page' },
  setLocalStorage: { scope: 'page' },
  clearLocalStorage: { scope: 'page' },
  title: { scope: 'page' },
  url: { scope: 'page' },
  html: { scope: 'page', paramFilter: ['selector', 'clean'] },
  text: { scope: 'page' },
  structure: { scope: 'page', paramFilter: ['selector'] },
};

function buildCliSchema(
  commandName: string
): z.ZodObject<Record<string, z.ZodType<unknown>>> | undefined {
  const def = commands[commandName];
  if (!def) return undefined;

  const meta = def.cliMeta;
  const schema = def.schema;

  if (!meta || !(schema instanceof z.ZodObject)) {
    return schema as z.ZodObject<Record<string, z.ZodType<unknown>>> | undefined;
  }

  const shape = (schema.def as { shape: Record<string, z.ZodType<unknown>> }).shape;
  if (!shape) return schema as z.ZodObject<Record<string, z.ZodType<unknown>>> | undefined;

  const newShape: Record<string, z.ZodType<unknown>> = {};
  const desc = meta.describe ?? {};
  const defs = meta.defaults ?? {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    let enriched: z.ZodType<unknown> = fieldSchema;
    if (defs[key] !== undefined) {
      enriched = (
        enriched as z.ZodType<unknown> & { default(v: unknown): z.ZodType<unknown> }
      ).default(defs[key]);
    }
    if (desc[key]) {
      enriched = (
        enriched as z.ZodType<unknown> & { describe(s: string): z.ZodType<unknown> }
      ).describe(desc[key]);
    }
    newShape[key] = enriched;
  }

  return z.object(newShape);
}

export function createCliCommand(cliName: string): RegisteredCommand | null {
  const config = FACTORY_COMMANDS[cliName];
  if (!config) return null;

  const xpageName = config.xpageCommand ?? cliName;
  const def = commands[xpageName];
  if (!def) return null;

  const cliSchema = buildCliSchema(xpageName);
  const filter = config.paramFilter;

  return {
    name: cliName,
    description: def.description,
    scope: config.scope,
    parameters: cliSchema,
    handler: async (params: Record<string, unknown>, ctx: BrowserCommandContext) => {
      const xpageParams = filter
        ? Object.fromEntries(Object.entries(params).filter(([k]) => filter.includes(k)))
        : params;
      const result = await executePageCommand(ctx.page, xpageName, xpageParams);
      return ok(result);
    },
  };
}

export function createCliCommands(names: string[]): RegisteredCommand[] {
  return names.map(createCliCommand).filter((c): c is RegisteredCommand => c !== null);
}
