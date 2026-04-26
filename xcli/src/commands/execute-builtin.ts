import type { CommandScope } from '../protocol/plugin-protocol';

import { openCommand } from './open';
import { clickCommand } from './click';
import { selectCommand } from './select';
import { checkCommand } from './check';
import { pressCommand } from './press';
import { getCommand } from './get';
import { closeCommand } from './close';
import { snapshotCommand } from './snapshot';
import { fillCommand } from './fill';
import { typeCommand } from './type';
import { waitCommand } from './wait';
import { httpCommand } from './http';
import { mouseCommand } from './mouse';
import { scrollCommand } from './scroll';
import { screenshotCommand } from './screenshot';
import { daemonCommand } from './daemon';
import { htmlCommand } from './html';
import { createCommand } from './create';
import { pluginsCommand } from './plugins';
import { removeCommand } from './remove';

import { listCommand } from './list';
import { gotoCommand } from './goto';
import { installCommand } from './install';
import { recordCommand } from './record';
import { replayCommand } from './replay';
import { structureCommand } from './structure';
import { killAllDaemon } from '../core/daemon-manager';

import type { CommandArgs, CommandValues } from '../core/types';

type BuiltinCommandFn = (args: CommandArgs, values: CommandValues) => Promise<void>;

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
  record: { handler: recordCommand, scope: 'page' },
  replay: { handler: replayCommand, scope: 'page' },
  structure: { handler: structureCommand, scope: 'page' },
  kill: {
    handler: async () => {
      await killAllDaemon();
      console.log('All daemon processes killed.');
    },
    scope: 'project',
  },
};

export function getBuiltinScope(name: string): CommandScope | undefined {
  return commands[name]?.scope;
}

export async function executeBuiltin(cmd: string, _args: CommandArgs, _values: CommandValues) {
  const entry = commands[cmd];
  if (entry) {
    await entry.handler(_args, _values);
  } else {
    console.error(`Unknown builtin command: ${cmd}`);
    process.exit(1);
  }
}
