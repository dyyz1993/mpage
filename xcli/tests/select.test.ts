import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

describe('select command', () => {
  const SESSION = 'test-select';

  beforeAll(async () => {
    spawn('tsx', ['bin/xcli.ts', 'open', 'about:blank', '--session', SESSION]);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    spawn('tsx', ['bin/xcli.ts', 'close', '--session', SESSION]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('should fail without selector', async () => {
    const select = spawn('tsx', ['bin/xcli.ts', 'select', '--session', SESSION]);
    let stderr = '';
    select.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(stderr).toContain('Error');
  });
});
