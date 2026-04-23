import { describe, it, expect } from 'vitest';
import { execAsync } from '../utils/exec';

const CLI = 'npx tsx bin/xcli.ts';

describe('xcli open', () => {
  describe('error handling', () => {
    it('should require URL argument', async () => {
      const { stdout, stderr, exitCode } = await execAsync(`${CLI} open`);
      expect(exitCode).toBeGreaterThan(0);
      expect((stdout + stderr)).toMatch(/Usage|usage/i);
    }, 30000);
  });
});