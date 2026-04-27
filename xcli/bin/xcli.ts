#!/usr/bin/env node

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { globalLoader } from '../src/core/plugin-loader';

interface ParsedArgs {
  values: Record<string, unknown>;
  positionals: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const values: Record<string, unknown> = {};
  const positionals: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        values[key] = parseValue(value);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('-') && !next.startsWith('--')) {
          values[key] = parseValue(next);
          i++;
        } else {
          values[key] = true;
        }
      }
      i++;
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      const shorts = arg.slice(1).split('');
      for (const short of shorts) {
        const next = argv[i + 1];
        if (next && !next.startsWith('-') && !next.startsWith('--')) {
          values[short] = parseValue(next);
          i++;
        } else {
          values[short] = true;
        }
      }
      i++;
      continue;
    }

    positionals.push(arg);
    i++;
  }

  return { values, positionals };
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  if (value === '[]') return [];
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim());
  }
  return value;
}

async function loadPlugins() {
  const cwd = process.cwd();
  const parentDir = join(cwd, '..');

  const pluginDirs = [
    join(cwd, '.xcli', 'plugins'),
    join(parentDir, '.xcli', 'plugins'),
    join(process.env.HOME || '', '.xcli', 'plugins'),
  ];

  for (const dir of pluginDirs) {
    if (existsSync(dir)) {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const pluginPath = join(dir, entry, 'index.ts');
          if (existsSync(pluginPath)) {
            try {
              await globalLoader.loadPlugin(pluginPath, entry);
            } catch (err) {
              console.error(
                `Failed to load plugin "${entry}": ${err instanceof Error ? err.message : err}`
              );
            }
          }
        }
      } catch {
        // Ignore errors reading plugin directory
      }
    }
  }
}

async function main() {
  await loadPlugins();

  const argv = process.argv.slice(2);
  const { values, positionals } = parseArgs(argv);

  if (values.help || positionals.length === 0) {
    console.log('Usage: xcli <command> [options]');
    return;
  }

  const [cmd, ...cmdArgs] = positionals;

  const isBuiltinCommand = [
    'open',
    'close',
    'kill',
    'list',
    'ls',
    'html',
    'screenshot',
    'viewer',
    'cookies',
    'localStorage',
    'snapshot',
    'get',
    'click',
    'fill',
    'type',
    'check',
    'select',
    'press',
    'scroll',
    'wait',
    'network',
    'mouse',
    'daemon',
    'create',
    'eval',
    'http',
    'navigate',
    'plugins',
    'remove',
    'install',
    'goto',
    'init',
    'record',
    'replay',
    'structure',
  ].includes(cmd);

  if (isBuiltinCommand) {
    try {
      const { executeBuiltin } = await import('../src/commands/execute-builtin');
      await executeBuiltin(cmd, cmdArgs, values);
    } catch {
      console.error(`Builtin command '${cmd}' not found`);
    }
    return;
  }

  const site = globalLoader.getSite(cmd);
  if (site) {
    const siteCmd = cmdArgs[0] || 'help';
    if (siteCmd === 'help') {
      console.log(`${site.name} - ${site.url || 'No URL'}`);
      console.log('');
      const cmds = site.getAllCommands();
      console.log('Commands:');
      for (const c of cmds) {
        console.log(`  ${c.name.padEnd(15)} ${c.description}`);
      }
      return;
    }
    const siteCmdObj = site.getCommand(siteCmd);
    if (siteCmdObj) {
      const { executeSiteCommand } = await import('../src/commands/execute-site');
      await executeSiteCommand(site, siteCmd, siteCmdObj, cmdArgs.slice(1), values);
      return;
    }
    console.error(`Unknown site command: ${siteCmd}`);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
