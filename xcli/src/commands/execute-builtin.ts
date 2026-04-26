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
import { killAllDaemon } from '../core/daemon-manager';

import type { CommandArgs, CommandValues } from '../core/types';

type BuiltinCommandFn = (args: CommandArgs, values: CommandValues) => Promise<void>;

const commands: Record<string, BuiltinCommandFn> = {
  open: openCommand,
  click: clickCommand,
  select: selectCommand,
  check: checkCommand,
  press: pressCommand,
  snapshot: snapshotCommand,
  fill: fillCommand,
  type: typeCommand,
  wait: waitCommand,
  http: httpCommand,
  mouse: mouseCommand,
  scroll: scrollCommand,
  screenshot: screenshotCommand,
  daemon: daemonCommand,
  html: htmlCommand,
  create: createCommand,
  plugins: pluginsCommand,
  remove: removeCommand,
  list: listCommand,
  ls: listCommand,
  get: getCommand,
  goto: gotoCommand,
  install: installCommand,
  close: closeCommand,
  kill: async () => {
    await killAllDaemon();
    console.log('All daemon processes killed.');
  },
};

export async function executeBuiltin(cmd: string, _args: CommandArgs, _values: CommandValues) {
  const command = commands[cmd];
  if (command) {
    await command(_args, _values);
  } else {
    console.error(`Unknown builtin command: ${cmd}`);
    process.exit(1);
  }
}
