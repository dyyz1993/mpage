import {
  type CoreConfig,
  type CommandValues,
  type OutputMode,
  type CommandResult,
  fail,
  OutputFormatter,
  HelpGenerator,
} from '@dyyz1993/xcli-core';

export const formatter = new OutputFormatter();
export const helpGen = new HelpGenerator();

export const VERSION = '0.1.0';

export const CORE_CONFIG: CoreConfig = {
  name: 'xcli-browser',
  version: VERSION,
  description: 'Browser automation CLI powered by xcli',
  configDirName: '.xcli',
  envPrefix: 'XCLI',
  pluginDirs: ['.xcli/plugins'],
  pluginPackageName: '@dyyz1993/xcli-core',
};

export function getOutputMode(values: CommandValues): OutputMode {
  if (values.json) return 'json';
  if (values.yaml) return 'yaml';
  return 'text';
}

export function outputResult(result: CommandResult, mode: OutputMode): void {
  console.log(formatter.format(result, { mode, color: true, emoji: true }));
}

export function outputError(message: string, mode: OutputMode): void {
  const result = fail(message);
  console.log(formatter.format(result, { mode, color: true, emoji: true }));
}
