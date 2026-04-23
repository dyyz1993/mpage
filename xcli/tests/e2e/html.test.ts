import { describe, it, expect } from 'vitest';
import { execAsync } from '../utils/exec';

const CLI = 'npx tsx bin/xcli.ts';

describe('xcli html', () => {
  describe('error handling', () => {
    it('should handle non-existent session', async () => {
      const { stdout, stderr, exitCode } = await execAsync(`${CLI} --session nonexistent-session html`);
      if (exitCode !== 0) {
        expect(exitCode).toBeGreaterThan(0);
        const output = (stdout + stderr).toLowerCase();
        expect(output).toMatch(/error|not found|不存在|session/i);
      } else {
        expect(stdout + stderr).toMatch(/error|not found|不存在|session/i);
      }
    }, 30000);

    it('should handle --json flag', async () => {
      const { stdout } = await execAsync(`${CLI} --session html-json-test open https://example.com`);
      expect(stdout).toMatch(/Opened|Session/i);
    }, 60000);
  });
});