#!/usr/bin/env node

import { parseArgs } from 'util';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { globalLoader } from '../src/core/plugin-loader';

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      session: { type: 'string', short: 's', default: 'default' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      interactive: { type: 'boolean', short: 'i' },
      full: { type: 'boolean', short: 'F' },
      name: { type: 'string' },
      value: { type: 'string' },
      key: { type: 'string' },
      domain: { type: 'string' },
      path: { type: 'string' },
      url: { type: 'string' },
      what: { type: 'string' },
      action: { type: 'string' },
      ref: { type: 'string' },
      text: { type: 'string' },
      timeout: { type: 'string' },
      direction: { type: 'string' },
      pixels: { type: 'string' },
      filter: { type: 'string' },
      body: { type: 'string' },
      abort: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  const [cmd, ...cmdArgs] = positionals;

  const isBuiltinCommand = [
    'daemon',
    'create',
    'open',
    'close',
    'kill',
    'list',
    'ls',
    'html',
    'cookies',
    'localStorage',
    'snapshot',
    'viewer',
    'screenshot',
    'get',
    'click',
    'fill',
    'type',
    'select',
    'press',
    'scroll',
    'wait',
    'network',
  ].includes(cmd);

  if (!cmd || (values.help && isBuiltinCommand)) {
    printHelp();
    return;
  }

  const session = values.session as string;
  void session;

  if (cmd === 'daemon') {
    const { daemonCommand } = await import('../src/commands/daemon');
    await daemonCommand(cmdArgs, values);
    return;
  }

  if (cmd === 'create') {
    const { createCommand } = await import('../src/commands/create');
    await createCommand(cmdArgs, values);
    return;
  }

  await loadPlugins();

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
      console.log('');
      console.log('Use --json for JSON output');
      return;
    }
    const siteCmdObj = site.getCommand(siteCmd);
    if (siteCmdObj) {
      const { executeSiteCommand } = await import('../src/commands/execute-site');
      await executeSiteCommand(site, siteCmd, siteCmdObj, cmdArgs.slice(1), values);
      return;
    }
  }

  console.error(`Unknown command: ${cmd}`);
  console.error(`Run 'xcli --help' for available commands`);
  process.exit(1);
}

async function loadPlugins() {
  const pluginsDir = '.xcli/plugins';
  if (!existsSync(pluginsDir)) return;

  const entries = readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = join(pluginsDir, entry.name, 'index.ts');
    if (existsSync(indexPath)) {
      try {
        await globalLoader.loadPlugin(indexPath);
      } catch {
        // skip
      }
    }
  }
}

function printHelp() {
  console.log(`
xcli - Browser Automation CLI

Usage:
  xcli <command> [options]

Global Options:
  --session <name>, -s <name>           Session name
  --json                               Output as JSON
  --help                               Show help

Commands:
  open <url>                            Open URL
  close                                 Close browser
  kill                                  Force kill browser
  list, ls                              List sessions
  html                                  Get page HTML
  cookies <get|set|clear>              Cookie operations
  localStorage <get|set|clear>          LocalStorage operations
  snapshot [-i]                         Get page snapshot
  viewer                                Open live viewer
  screenshot [--full]                   Take screenshot
  get <url|title|text>                 Get page info
  click <@eref>                         Click element
  fill <@eref> <text>                  Fill input
  type <@eref> <text>                  Type text
  select <@eref> <value>               Select option
  press <key>                           Press key
  scroll <up|down> <px>               Scroll page
  wait <ms|@eref|--load>               Wait
  network <requests|route|unroute>      Network monitoring
  daemon <start|stop|status>           Daemon management
  create --name <case_id>              Create plugin

Examples:
  xcli open https://example.com
  xcli --session demo open https://qq.com
  xcli --session demo cookies get
  xcli --session demo localStorage set --key theme --value dark
  xcli --session demo viewer
  xcli create --name 01-static
  `);
}

main();
