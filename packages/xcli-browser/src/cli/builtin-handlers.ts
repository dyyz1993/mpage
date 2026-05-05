import {
  Core,
  type CommandArgs,
  type CommandValues,
  ok,
  ScaffoldEngine,
  BASE_CLI_TEMPLATE,
  MINIMAL_PLUGIN_TEMPLATE,
  getConfigValue,
  setConfigValue,
  getAllConfigKeys,
  isDaemonRunning,
  startDaemon,
  stopDaemon,
  getDaemonStatus,
  killAllDaemon,
} from '@dyyz1993/xcli-core';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CORE_CONFIG, getOutputMode, outputResult, outputError } from './output.js';

export function handleConfig(args: CommandArgs, values: CommandValues): void {
  const mode = getOutputMode(values);
  const core = new Core(CORE_CONFIG);

  if (args.length === 0) {
    const keys = getAllConfigKeys();
    const entries = keys.map((key) => {
      const val = getConfigValue(core, key);
      return { key, value: val ?? '(not set)' };
    });
    outputResult(ok(entries), mode);
    return;
  }

  const key = args[0];

  if (args.length === 1) {
    const val = getConfigValue(core, key);
    if (val === undefined) {
      outputError(`Unknown config key: ${key}`, mode);
      process.exit(1);
    }
    outputResult(ok({ key, value: val }), mode);
    return;
  }

  const value = args[1];
  const success = setConfigValue(core, key, value);
  if (!success) {
    outputError(`Failed to set config: ${key}`, mode);
    process.exit(1);
  }
  outputResult(ok({ key, value }), mode);
}

export async function handleCreate(args: CommandArgs, values: CommandValues): Promise<void> {
  const mode = getOutputMode(values);
  const name = args[0];
  if (!name) {
    outputError('Missing project name', mode);
    process.exit(1);
  }

  const templateName = (values.template as string) || 'minimal-plugin';
  const engine = new ScaffoldEngine();
  engine.registerTemplate(BASE_CLI_TEMPLATE);
  engine.registerTemplate(MINIMAL_PLUGIN_TEMPLATE);

  try {
    const result = await engine.generate(templateName, name, {
      targetDir: resolve(process.cwd(), name),
      variables: values as Record<string, string>,
    });
    outputResult(
      ok({
        projectDir: result.projectDir,
        files: result.files.length,
        skipped: result.skipped.length,
        overwritten: result.overwritten.length,
      }),
      mode
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    outputError(msg, mode);
    process.exit(1);
  }
}

export async function handleInit(args: CommandArgs, values: CommandValues): Promise<void> {
  const mode = getOutputMode(values);
  const name = args[0];
  if (!name) {
    outputError('Missing project name', mode);
    process.exit(1);
  }

  const engine = new ScaffoldEngine();
  engine.registerTemplate(BASE_CLI_TEMPLATE);

  try {
    const result = await engine.generate('base-cli', name, {
      targetDir: resolve(process.cwd(), name),
      variables: values as Record<string, string>,
    });
    outputResult(
      ok({
        projectDir: result.projectDir,
        files: result.files.length,
      }),
      mode
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    outputError(msg, mode);
    process.exit(1);
  }
}

export async function handleDaemon(args: CommandArgs, values: CommandValues): Promise<void> {
  const mode = getOutputMode(values);
  const core = new Core(CORE_CONFIG);

  const action = (args[0] as string) || 'status';
  const config = {
    configDir: core.configDir,
    workerEntryPath: resolve(dirname(fileURLToPath(import.meta.url)), '../daemon/worker-entry.js'),
  };

  switch (action) {
    case 'start': {
      if (isDaemonRunning(config)) {
        const status = getDaemonStatus(config);
        outputResult(ok({ status: 'already running', port: status.port, pid: status.pid }), mode);
        return;
      }
      try {
        const { port, pid } = await startDaemon(config);
        outputResult(ok({ status: 'started', port, pid }), mode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        outputError(msg, mode);
        process.exit(1);
      }
      break;
    }
    case 'stop': {
      await stopDaemon(config);
      outputResult(ok({ status: 'stopped' }), mode);
      break;
    }
    case 'status': {
      const status = getDaemonStatus(config);
      outputResult(ok(status), mode);
      break;
    }
    case 'kill': {
      await killAllDaemon(config);
      outputResult(ok({ status: 'killed' }), mode);
      break;
    }
    default:
      outputError(`Unknown daemon action: ${action}`, mode);
      process.exit(1);
  }
}
