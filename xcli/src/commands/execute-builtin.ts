import { openCommand } from './open';
import { clickCommand } from './click';
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
import { listCommand } from './remove';
import { navigateCommand } from './navigate';

const commands: Record<string, any> = {
  open: openCommand,
  click: clickCommand,
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
  list: listCommand,
  ls: listCommand,
  html: htmlCommand,
  get: navigateCommand,
  goto: navigateCommand,
  close: async () => {
    console.log('Close not implemented');
  },
  kill: async () => {
    console.log('Kill not implemented');
  },
};

export async function executeBuiltin(cmd: string, _args: string[], _values: Record<string, any>) {
  const command = commands[cmd];
  if (command) {
    await command(_args, _values);
  } else {
    console.error(`Unknown builtin command: ${cmd}`);
    process.exit(1);
  }
}
