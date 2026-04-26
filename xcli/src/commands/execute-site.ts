// eslint-disable-next-line no-restricted-imports -- TODO: execute-site 直接创建浏览器，后续应迁移到 daemon 模式
import { chromium } from 'playwright';
import type {
  CommandContext,
  SiteInstance,
  CommandHandler,
  CommandScope,
  ZodSchema,
} from '../protocol/plugin-protocol';
import { CommandError } from '../protocol/plugin-protocol';
import { analyzePage, formatTips } from '../core/page-hook';
import { fail, wrapResult, withMeta, type CommandResult } from '../core/command-result';
import { generateTips, formatResult } from '../core/tips-engine';
import { coerceCliArgs } from '../core/param-coercion';
import type { CommandArgs, CommandValues } from '../core/types';

interface SiteCommandEntry {
  name: string;
  description: string;
  requiresLogin?: boolean;
  scope: CommandScope;
  parameters?: ZodSchema;
  result?: ZodSchema;
  examples?: Array<{ cmd: string; description: string }>;
  tips?: string[];
  handler: CommandHandler;
}

export function checkScope(scope: CommandScope, ctx: CommandContext): string | null {
  switch (scope) {
    case 'project':
      return null;
    case 'browser':
      return ctx.page ? null : '需要浏览器实例，请先执行 xcli open <url>';
    case 'page':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
    case 'element':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
  }
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

  const storage = site.getStorage();

  const outputMode: 'json' | 'yaml' | 'text' = values.yaml ? 'yaml' : values.json ? 'json' : 'text';

  const ctx: CommandContext = {
    args,
    options: values,
    cwd: process.cwd(),
    page,
    storage,
    output: {
      mode: outputMode,
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
    const coercedValues = coerceCliArgs(cmd.parameters, values);
    const params = parseParams(cmd.parameters, args, coercedValues);

    const scopeError = checkScope(cmd.scope ?? 'page', ctx);
    if (scopeError) {
      const result = fail(scopeError, ['检查命令所需的 scope 是否满足']);
      result.meta = { duration: 0, command: cmdName, site: site.name };
      if (outputMode === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatResult(result, 'text'));
      }
      await browser.close();
      return;
    }

    const start = Date.now();

    let result: CommandResult;
    try {
      const raw = await cmd.handler(params, ctx);
      result = wrapResult(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const tips = generateTips(err instanceof Error ? err : message);
      result = fail(message, tips);
    }

    const duration = Date.now() - start;
    result = withMeta(result, { duration, command: cmdName, site: site.name });

    const url = page.url();
    const title = await page.title().catch(() => '');
    const html = await page.content().catch(() => '');

    const detection = analyzePage({ html, url, title });

    if (detection.type !== null) {
      const pageTips = formatTips(detection);
      result.tips.push(...pageTips);
    }

    if (outputMode === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatResult(result, 'text'));
    }
  } catch (err) {
    if (err instanceof CommandError && err.code === 'INVALID_ARGS') {
      const tips = generateTips(err.message);
      const result = fail(err.message, [...tips, '检查命令参数: xcli <site> <command> --help']);
      console.log(formatResult(result, outputMode));
      return;
    }
    throw err;
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
