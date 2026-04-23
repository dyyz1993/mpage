import { describe, it, expect } from 'vitest';
import { execAsync } from '../utils/exec';

const CLI = 'npx tsx bin/xcli.ts';

describe('xcli screenshot', () => {
  describe('error handling', () => {
    it('should handle non-existent session', async () => {
      const { stdout, stderr, exitCode } = await execAsync(`${CLI} --session nonexistent-session screenshot`);
      if (exitCode !== 0) {
        expect(exitCode).toBeGreaterThan(0);
        const output = (stdout + stderr).toLowerCase();
        expect(output).toMatch(/error|not found|不存在|session/i);
      } else {
        expect(stdout + stderr).toMatch(/error|not found|不存在|session/i);
      }
    }, 30000);
  });

  describe('daemon integration', () => {
    it('should return screenshot data', async () => {
      await execAsync(`${CLI} --session screenshot-test open https://example.com`);
      const { stdout } = await execAsync(`${CLI} --session screenshot-test screenshot`);
      expect(stdout).toMatch(/data:image\/png/);
    }, 60000);
  });
});