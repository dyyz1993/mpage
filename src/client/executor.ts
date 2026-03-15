import {
  commands,
  parseArgsToRecord,
  parseCommandChain,
  splitCommand,
  getCommandNames,
  findSimilarCommands,
} from '../index.js';
import type { IPCResponse } from './ipc.js';

export interface ExecuteResult {
  output: string;
  error: boolean;
  tips?: string;
}

export async function executeCommand(
  sendRequest: (data: unknown) => Promise<IPCResponse>,
  cmd: string,
  args: Record<string, unknown>,
  jsonMode: boolean = false
): Promise<ExecuteResult> {
  try {
    const response = await sendRequest({ command: cmd, args });

    if (!response.success) {
      return {
        output: response.error || 'Unknown error',
        error: true,
        tips: response.tips,
      };
    }

    const content = response.content;
    const tips = response.tips;

    if (jsonMode) {
      return {
        output: JSON.stringify({ success: true, content, tips }, null, 2),
        error: false,
      };
    }

    let output = '';
    if (content !== undefined && content !== null) {
      if (typeof content === 'string') {
        output = content;
      } else if (typeof content === 'object') {
        const c = content as Record<string, unknown>;
        if (c.url !== undefined) output = String(c.url);
        else if (c.title !== undefined) output = String(c.title);
        else if (c.text !== undefined) output = String(c.text);
        else if (c.html !== undefined) output = String(c.html);
        else if (c.path !== undefined) output = String(c.path);
        else if (c.snapshot !== undefined) {
          output =
            typeof c.snapshot === 'string' ? c.snapshot : JSON.stringify(c.snapshot, null, 2);
        } else if (c.elements !== undefined) output = JSON.stringify(c.elements, null, 2);
        else if (c.result !== undefined) output = JSON.stringify(c.result, null, 2);
        else output = JSON.stringify(content, null, 2);
      }
    }

    return { output, error: false, tips };
  } catch (e: unknown) {
    return { output: (e as Error).message, error: true };
  }
}

export async function executePipeline(
  sendRequest: (data: unknown) => Promise<IPCResponse>,
  pipeline: string[],
  jsonMode: boolean = false
): Promise<ExecuteResult> {
  let currentOutput = '';
  let currentTips = '';

  for (const cmdStr of pipeline) {
    const parts = splitCommand(cmdStr);
    const cmd = parts[0];
    const cmdArgs = parts.slice(1);

    if (!commands[cmd]) {
      const suggestions = findSimilarCommands(cmd, getCommandNames());
      return {
        output: `Unknown command: ${cmd}`,
        error: true,
        tips:
          suggestions.length > 0
            ? `你是想输入 '${suggestions[0]}' 吗？相似命令: ${suggestions.join(', ')}`
            : undefined,
      };
    }

    const schema = commands[cmd].schema;
    const args = parseArgsToRecord(cmdArgs, schema);

    try {
      schema.parse(args);
    } catch (e: unknown) {
      return { output: `Invalid args for ${cmd}: ${(e as Error).message}`, error: true };
    }

    const result = await executeCommand(sendRequest, cmd, args, jsonMode);
    currentOutput = result.output;
    if (result.tips) currentTips = result.tips;
    if (result.error) return { output: currentOutput, error: true, tips: currentTips };
  }

  return { output: currentOutput, error: false, tips: currentTips };
}

export async function executeCommandChain(
  sendRequest: (data: unknown) => Promise<IPCResponse>,
  input: string,
  jsonMode: boolean = false
): Promise<ExecuteResult> {
  const parsed = parseCommandChain(input);
  let lastOutput = '',
    lastError = false,
    lastTips = '';

  for (const { pipeline, type } of parsed) {
    if (type === 'and' && lastError) continue;
    const result = await executePipeline(sendRequest, pipeline, jsonMode);
    lastOutput = result.output;
    lastError = result.error;
    if (result.tips) lastTips = result.tips;
  }

  return { output: lastOutput, error: lastError, tips: lastTips };
}
