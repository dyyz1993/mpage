import {
  Core,
  type CommandArgs,
  type CommandValues,
  coerceCliArgs,
  wrapResult,
  withMeta,
} from '@dyyz1993/xcli-core';
import type { BrowserCommandContext } from '../context.js';
import { resolve } from 'path';
import { CORE_CONFIG, getOutputMode, outputResult, outputError, helpGen } from './output.js';

function join(...segments: string[]): string {
  return segments.join('/');
}

export async function handlePluginCommand(
  siteName: string,
  commandName: string,
  args: CommandArgs,
  values: CommandValues
): Promise<void> {
  const mode = getOutputMode(values);
  const core = new Core(CORE_CONFIG);
  const loader = core.loader;

  const cwd = process.cwd();
  const pluginDirs = CORE_CONFIG.pluginDirs.map((d) => resolve(cwd, d));

  for (const dir of pluginDirs) {
    try {
      const { readdirSync } = await import('fs');
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const pluginPath = entry.isDirectory()
          ? join(dir, entry.name, 'index.ts')
          : join(dir, entry.name);
        try {
          await loader.loadPlugin(pluginPath);
        } catch {
          // skip broken plugins
        }
      }
    } catch {
      // dir doesn't exist
    }
  }

  const site = loader.getSite(siteName);
  if (!site) {
    const sites = loader.getSites();
    if (sites.length > 0) {
      const available = sites.map((s) => s.name).join(', ');
      outputError(`Site '${siteName}' not found. Available: ${available}`, mode);
    } else {
      outputError(`Site '${siteName}' not found. No plugins loaded.`, mode);
    }
    process.exit(1);
  }

  const cmd = site.getCommand(commandName);
  if (!cmd) {
    const commands = site.getAllCommands();
    const available = commands.map((c) => c.name).join(', ');
    outputError(
      `Command '${commandName}' not found in '${siteName}'. Available: ${available}`,
      mode
    );
    process.exit(1);
  }

  if (values.help) {
    console.log(
      helpGen.generate(
        {
          name: `${siteName} ${commandName}`,
          description: cmd.description,
          parameters: cmd.parameters,
          result: cmd.result,
          examples: cmd.examples,
          tips: cmd.tips,
        },
        { color: true, emoji: true }
      )
    );
    return;
  }

  try {
    const coercedValues = cmd.parameters ? coerceCliArgs(cmd.parameters, values) : values;
    const params: Record<string, unknown> = { ...coercedValues };
    for (let i = 0; i < args.length; i++) {
      params[`arg${i}`] = args[i];
    }

    const result = await cmd.handler(params, {
      args,
      options: values,
      cwd: process.cwd(),
      page: null,
      browser: null,
      browserContext: null,
      storage: site.getStorage(),
      output: {
        mode,
        showTips: !values['no-tips'],
        color: !values['no-color'],
        emoji: !values['no-emoji'],
      },
      error: (msg: string) => console.error(msg),
      config: {},
      site,
      cliName: 'xcli-browser',
    } as unknown as BrowserCommandContext);

    const wrapped = wrapResult(result);
    const withDuration = withMeta(wrapped, {
      command: commandName,
      site: siteName,
    });
    outputResult(withDuration, mode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    outputError(msg, mode);
    process.exit(1);
  } finally {
    await loader.unload();
  }
}
