import {
  builtins,
  getBuiltin,
  getAllBuiltins,
  type BuiltinCommand,
  type BuiltinContext,
} from './info.js';
import { pluginsBuiltin } from './plugins/list.js';
import { installBuiltin } from './plugins/install.js';
import { removeBuiltin } from './plugins/remove.js';

export { getBuiltin, getAllBuiltins, type BuiltinCommand, type BuiltinContext };

export const allBuiltins: BuiltinCommand[] = [
  ...builtins,
  pluginsBuiltin,
  installBuiltin,
  removeBuiltin,
];

export function findBuiltin(name: string): BuiltinCommand | undefined {
  return allBuiltins.find((b) => b.name === name || b.aliases?.includes(name));
}

export function getBuiltinList(): { name: string; description: string }[] {
  return allBuiltins.map((b) => ({ name: b.name, description: b.description }));
}
