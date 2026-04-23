import { chromium } from 'playwright';
import { stringify } from 'yaml';
import type { CommandContext } from '../protocol/plugin-protocol';
import { globalLoader } from '../core/plugin-loader';

export async function executeSiteCommand(
  site: any,
  cmdName: string,
  cmd: any,
  args: string[],
  values: Record<string, any>
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
      get: async (key: string) => await storage.get(key),
      set: async (key: string, value: any) => await storage.set(key, value),
      delete: async (key: string) => await storage.delete(key),
    },
    output: {
      mode: values.json ? 'json' : 'yaml',
      showTips: !values['no-tips'],
      color: !values['no-color'],
      emoji: !values['no-emoji'],
    },
    config: {},
    site: null as any,
    browser: { executablePath },
  };

  try {
    const params = parseParams(cmd.parameters, args);
    const result = await cmd.handler(params, ctx);

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(stringify(result));
    }
  } finally {
    await browser.close();
  }
}

function parseParams(schema: any, args: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  if (!schema || !schema._def) return result;

  if (schema._def.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    let i = 0;
    for (const [key, field] of Object.entries(shape)) {
      const f = field as any;
      if (args[i] !== undefined) {
        if (f._def?.typeName === 'ZodNumber') {
          result[key] = isNaN(Number(args[i])) ? args[i] : Number(args[i]);
        } else if (f._def?.typeName === 'ZodDefault') {
          const inner = f._def.innerType;
          if (inner?._def?.typeName === 'ZodNumber') {
            result[key] = isNaN(Number(args[i])) ? args[i] : Number(args[i]);
          } else {
            result[key] = args[i];
          }
        } else {
          result[key] = args[i];
        }
        i++;
      }
    }
  }
  return result;
}
