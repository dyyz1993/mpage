import type { CommandScope } from '@xcli/core';
import type { Core } from '@xcli/core';

import { openCommand } from './commands/open.js';
import { clickCommand } from './commands/click.js';
import { selectCommand } from './commands/select.js';
import { checkCommand } from './commands/check.js';
import { pressCommand } from './commands/press.js';
import { getCommand } from './commands/get.js';
import { closeCommand } from './commands/close.js';
import { snapshotCommand } from './commands/snapshot.js';
import { fillCommand } from './commands/fill.js';
import { typeCommand } from './commands/type.js';
import { waitCommand } from './commands/wait.js';
import { httpCommand } from './commands/http.js';
import { mouseCommand } from './commands/mouse.js';
import { scrollCommand } from './commands/scroll.js';
import { screenshotCommand } from './commands/screenshot.js';
import { daemonCommand } from './commands/daemon.js';
import { htmlCommand } from './commands/html.js';
import { createCommand } from './commands/create.js';
import { pluginsCommand } from './commands/plugins.js';
import { removeCommand } from './commands/remove.js';

import { listCommand } from './commands/list.js';
import { gotoCommand } from './commands/goto.js';
import { installCommand } from './commands/install.js';
import { initCommand } from './commands/init.js';
import { recordCommand } from './commands/record.js';
import { replayCommand } from './commands/replay.js';
import { structureCommand } from './commands/structure.js';

import { allBuiltins } from './builtins/index.js';
import type { CommandArgs, CommandValues } from '@xcli/core';

type BuiltinCommandFn = (args: CommandArgs, values: CommandValues, core?: Core) => Promise<void>;

interface BuiltinEntry {
  handler: BuiltinCommandFn;
  scope: CommandScope;
}

const commands: Record<string, BuiltinEntry> = {
  open: { handler: openCommand, scope: 'browser' },
  close: { handler: closeCommand, scope: 'browser' },
  click: { handler: clickCommand, scope: 'element' },
  select: { handler: selectCommand, scope: 'element' },
  check: { handler: checkCommand, scope: 'element' },
  press: { handler: pressCommand, scope: 'element' },
  snapshot: { handler: snapshotCommand, scope: 'page' },
  fill: { handler: fillCommand, scope: 'element' },
  type: { handler: typeCommand, scope: 'element' },
  wait: { handler: waitCommand, scope: 'element' },
  http: { handler: httpCommand, scope: 'page' },
  mouse: { handler: mouseCommand, scope: 'element' },
  scroll: { handler: scrollCommand, scope: 'element' },
  screenshot: { handler: screenshotCommand, scope: 'page' },
  daemon: { handler: daemonCommand, scope: 'project' },
  html: { handler: htmlCommand, scope: 'page' },
  create: { handler: createCommand, scope: 'project' },
  plugins: { handler: pluginsCommand, scope: 'project' },
  remove: { handler: removeCommand, scope: 'project' },
  list: { handler: listCommand, scope: 'project' },
  ls: { handler: listCommand, scope: 'project' },
  get: { handler: getCommand, scope: 'element' },
  goto: { handler: gotoCommand, scope: 'page' },
  install: { handler: installCommand, scope: 'project' },
  init: { handler: initCommand, scope: 'project' },
  record: { handler: recordCommand, scope: 'page' },
  replay: { handler: replayCommand, scope: 'page' },
  structure: { handler: structureCommand, scope: 'page' },
  kill: {
    // eslint-disable-next-line require-await
    handler: async () => {
      console.error('Error: kill requires daemon-manager. Use @xcli/daemon package.');
    },
    scope: 'project',
  },
};

for (const builtin of allBuiltins) {
  if (!commands[builtin.name]) {
    commands[builtin.name] = {
      handler: (args, values, core) =>
        builtin.execute(args, values, {
          cwd: process.cwd(),
          plugins: new Map(),
          loadPlugin: () => Promise.resolve(null),
          getPluginSource: () => null,
          core,
        }),
      scope: 'project',
    };
  }
}

export function getBuiltinScope(name: string): CommandScope | undefined {
  return commands[name]?.scope;
}

export async function executeBuiltin(
  cmd: string,
  _args: CommandArgs,
  _values: CommandValues,
  core?: Core
) {
  const entry = commands[cmd];
  if (entry) {
    await entry.handler(_args, _values, core);
  } else {
    console.error(`Unknown builtin command: ${cmd}`);
    process.exit(1);
  }
}
