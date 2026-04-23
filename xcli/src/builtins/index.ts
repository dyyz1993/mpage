import type { BuiltinCommand, BuiltinContext } from './info.js';
import { infoBuiltin } from './info.js';
import { pluginsBuiltin, installBuiltin, removeBuiltin } from './plugins/install.js';
import { listBuiltin } from './plugins/list.js';
import {
  daemonBuiltin,
  openBuiltin,
  sessionsBuiltin,
  statusBuiltin,
  htmlBuiltin,
  closeBuiltin,
  killBuiltin,
  cookieBuiltin,
  localStorageBuiltin,
} from './session.js';
import { viewerBuiltin } from './viewer.js';

export { type BuiltinCommand, type BuiltinContext };

export const allBuiltins: BuiltinCommand[] = [
  daemonBuiltin,
  openBuiltin,
  sessionsBuiltin,
  statusBuiltin,
  htmlBuiltin,
  closeBuiltin,
  killBuiltin,
  cookieBuiltin,
  localStorageBuiltin,
  viewerBuiltin,
  infoBuiltin,
  pluginsBuiltin,
  installBuiltin,
  removeBuiltin,
  listBuiltin,
];

export function getBuiltin(name: string): BuiltinCommand | undefined {
  return allBuiltins.find((b) => b.name === name || b.aliases?.includes(name));
}
