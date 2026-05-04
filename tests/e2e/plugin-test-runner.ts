import { spawn } from 'child_process';
import { resolve } from 'path';

export interface PluginTestResult {
  pluginId: string;
  command: string;
  status: 'pass' | 'fail';
  data?: unknown;
  errors?: Array<{ field: string; expected: string; actual: string }>;
  tips?: string[];
  duration?: number;
}

export async function runPluginCommand(
  pluginId: string,
  command: string,
  params?: Record<string, unknown>
): Promise<PluginTestResult> {
  const startTime = Date.now();

  const cmd = ['npx', 'xcli', pluginId, command];
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      cmd.push(`--${key}`, String(value));
    });
  }
  cmd.push('--json');

  return new Promise((resolve, reject) => {
    const process = spawn(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      const duration = Date.now() - startTime;

      if (code !== 0) {
        resolve({
          pluginId,
          command,
          status: 'fail',
          errors: [{ field: 'execution', expected: '0', actual: String(code) }],
          tips: [stderr || '命令执行失败'],
          duration,
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({
          pluginId,
          command,
          status: result.status || 'pass',
          data: result.data,
          errors: result.errors || [],
          tips: result.tips || [],
          duration,
        });
      } catch (e) {
        resolve({
          pluginId,
          command,
          status: 'fail',
          errors: [{ field: 'parse', expected: 'JSON', actual: 'invalid' }],
          tips: [stdout],
          duration,
        });
      }
    });
  });
}

export async function batchTestPlugins(
  pluginIds: string[],
  command: string = 'verify'
): Promise<PluginTestResult[]> {
  const results: PluginTestResult[] = [];

  for (const pluginId of pluginIds) {
    const result = await runPluginCommand(pluginId, command);
    results.push(result);
  }

  return results;
}
