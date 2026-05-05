import {
  type CommandValues,
  type CommandArgs,
  ok,
  fail,
  type CommandResult,
  OutputFormatter,
  type OutputMode,
} from '@dyyz1993/xcli-core';
import { gotoSession, clickSession, fillSession } from '../session/browser-session-client.js';
import { ensureSession } from './session-handlers.js';

const formatter = new OutputFormatter();

function getOutputMode(values: CommandValues): OutputMode {
  if (values.json) return 'json';
  if (values.yaml) return 'yaml';
  return 'text';
}

function formatResult(result: CommandResult, mode: OutputMode): string {
  return formatter.format(result, {
    mode,
    color: !process.env.NO_COLOR,
    emoji: !process.env.NO_EMOJI,
  });
}

function resolveSessionName(values: CommandValues): string {
  return (values.session as string) || 'default';
}

export async function handleDirectGoto(args: CommandArgs, values: CommandValues): Promise<void> {
  const url = (values.url as string) || args[0];
  if (!url) {
    const result = fail('Missing required option: --url <url>', [
      'Usage: xcli-browser goto --url <url>',
    ]);
    console.log(formatResult(result, getOutputMode(values)));
    process.exit(1);
  }

  const sessionName = resolveSessionName(values);
  ensureSession(sessionName);

  try {
    const res = await gotoSession(sessionName, url);
    console.log(formatResult(ok(res), getOutputMode(values)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(formatResult(fail(msg), getOutputMode(values)));
    process.exit(1);
  }
}

export async function handleDirectClick(args: CommandArgs, values: CommandValues): Promise<void> {
  const selector = (values.selector as string) || args[0];
  if (!selector) {
    const result = fail('Missing required option: --selector <sel>', [
      'Usage: xcli-browser click --selector <sel>',
    ]);
    console.log(formatResult(result, getOutputMode(values)));
    process.exit(1);
  }

  const sessionName = resolveSessionName(values);

  try {
    const res = await clickSession(sessionName, selector);
    console.log(formatResult(ok(res), getOutputMode(values)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(formatResult(fail(msg), getOutputMode(values)));
    process.exit(1);
  }
}

export async function handleDirectFill(args: CommandArgs, values: CommandValues): Promise<void> {
  const selector = (values.selector as string) || args[0];
  const value = (values.value as string) || args[1];
  if (!selector || !value) {
    const result = fail('Missing required options: --selector <sel> --value <val>', [
      'Usage: xcli-browser fill --selector <sel> --value <val>',
    ]);
    console.log(formatResult(result, getOutputMode(values)));
    process.exit(1);
  }

  const sessionName = resolveSessionName(values);

  try {
    const res = await fillSession(sessionName, selector, value);
    console.log(formatResult(ok(res), getOutputMode(values)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(formatResult(fail(msg), getOutputMode(values)));
    process.exit(1);
  }
}
