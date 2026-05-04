import type { BuiltinCommand, BuiltinContext } from './info.js';
import { infoBuiltin } from './info.js';
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
import { configBuiltin } from './config.js';

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
  configBuiltin,
  infoBuiltin,
];

export function getBuiltin(name: string): BuiltinCommand | undefined {
  return allBuiltins.find((b) => b.name === name || b.aliases?.includes(name));
}
