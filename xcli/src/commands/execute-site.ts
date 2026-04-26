import { chromium } from 'playwright';
import { stringify } from 'yaml';
import type {
  CommandContext,
  SiteInstance,
  CommandHandler,
  ZodSchema,
} from '../protocol/plugin-protocol';
import { globalLoader } from '../core/plugin-loader';
import { analyzePage, formatTips } from '../core/page-hook';
import type { CommandArgs, CommandValues } from '../core/types';

interface SiteCommandEntry {
  name: string;
  description: string;
  requiresLogin?: boolean;
  parameters?: ZodSchema;
  result?: ZodSchema;
  examples?: Array<{ cmd: string; description: string }>;
  tips?: string[];
  handler: CommandHandler;
}

export async function executeSiteCommand(
  site: SiteInstance,
  cmdName: string,
  cmd: SiteCommandEntry,
  args: CommandArgs,
  values: CommandValues
) {
  const executablePath =
    process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();

  const storage = globalLoader.getStorage();

  const ctx: CommandContext = {
    args,
    options: values,
    cwd: process.cwd(),
    page,
    storage: {
      get: async <T>(key: string) => await storage.get<T>(key),
      set: async <T>(key: string, value: T) => await storage.set(key, value),
      delete: async (key: string) => await storage.delete(key),
    },
    output: {
      mode: values.json ? 'json' : 'yaml',
      showTips: !values['no-tips'],
      color: !values['no-color'],
      emoji: !values['no-emoji'],
    },
    error: (msg: string) => console.error(msg),
    config: {},
    site: null as unknown as SiteInstance,
    browser: { executablePath },
  };

  try {
    const params = parseParams(cmd.parameters, args, values);
    const result = await cmd.handler(params, ctx);

    const url = page.url();
    const title = await page.title().catch(() => '');
    const html = await page.content().catch(() => '');

    const detection = analyzePage({ html, url, title });

    if (detection.type !== null && Array.isArray(result.tips)) {
      const tips = formatTips(detection);
      for (const tip of tips) {
        result.tips.push(tip);
      }
    }

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(stringify(result));
    }
  } finally {
    await browser.close();
  }
}

interface ZodFieldDef {
  typeName?: string;
  shape?: () => Record<string, unknown>;
  innerType?: unknown;
  defaultValue?: () => unknown;
}

function parseParams(
  schema: ZodSchema | undefined,
  args: CommandArgs,
  options: CommandValues
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!schema || !(schema as unknown as { _def?: ZodFieldDef })._def) return result;

  const schemaDef = (schema as unknown as { _def: ZodFieldDef })._def;
  if (schemaDef.typeName === 'ZodObject') {
    const shape =
      typeof schemaDef.shape === 'function'
        ? schemaDef.shape()
        : schemaDef.shape
          ? (schemaDef.shape as Record<string, unknown>)
          : undefined;
    if (!shape) return result;
    let remainingArgs = [...args];
    for (const [key, field] of Object.entries(shape)) {
      const f = field as unknown as { _def?: ZodFieldDef };

      if (options[key] !== undefined) {
        result[key] = options[key];
      } else if (remainingArgs.length > 0) {
        if (f._def?.typeName === 'ZodNumber') {
          result[key] = isNaN(Number(remainingArgs[0]))
            ? remainingArgs[0]
            : Number(remainingArgs[0]);
        } else if (f._def?.typeName === 'ZodDefault') {
          const inner = f._def.innerType as unknown as { _def?: ZodFieldDef };
          if (inner?._def?.typeName === 'ZodNumber') {
            result[key] = isNaN(Number(remainingArgs[0]))
              ? remainingArgs[0]
              : Number(remainingArgs[0]);
          } else {
            result[key] = remainingArgs[0];
          }
        } else {
          result[key] = remainingArgs[0];
        }
        remainingArgs = remainingArgs.slice(1);
      } else if (f._def?.typeName === 'ZodDefault') {
        result[key] = f._def.defaultValue?.();
      }
    }
  }
  return result;
}
