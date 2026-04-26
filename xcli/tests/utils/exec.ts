import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execAsync(
  command: string,
  options: { timeout?: number; cwd?: string } = {}
): Promise<ExecResult> {
  try {
    const { stdout, stderr, exitCode } = await exec(command, {
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
    });
    return { stdout: stdout || '', stderr: stderr || '', exitCode: exitCode || 0 };
  } catch (error: unknown) {
    const err = error as { code?: number; stdout?: string; stderr?: string; message?: string };
    const exitCode = typeof err.code === 'number' ? err.code : 1;
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode,
    };
  }
}
