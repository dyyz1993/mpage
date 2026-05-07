import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkGuard, addGuardRule, clearGuardCache } from '../../src/agent-guard.js';
import type { GuardRule } from '../../src/agent-guard.js';
import { Core } from '../../src/core.js';

let tmpDir: string;
let core: Core;
const origCwd = process.cwd();

function createCore(configDir: string) {
  const c = new Core({
    name: 'test',
    version: '0.0.1',
    description: 'test',
    configDirName: '.test-xcli',
    envPrefix: 'XCLI',
    pluginDirs: [],
  });
  (c as unknown as { configDir: string }).configDir = configDir;
  return c;
}

describe('agent-guard — uncovered branches', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'xcli-guard-br-'));
    core = createCore(tmpDir);
    clearGuardCache();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('writeSettingsFile — mkdirSync path (line 45)', () => {
    it('should create parent directory when it does not exist', () => {
      const newDir = join(tmpDir, 'nested', 'deep', 'dir');
      const coreNested = createCore(newDir);

      addGuardRule(coreNested, 'admin', {
        match: ['*'],
        block: [],
        message: '',
      });

      expect(existsSync(join(newDir, 'settings.json'))).toBe(true);
    });
  });

  describe('checkGuard — match pattern *xxx* (contains wildcard, line 128)', () => {
    it('should match command containing pattern with wildcards on both sides', () => {
      const rule: GuardRule = {
        match: ['*delete*'],
        block: ['*'],
        message: 'contains delete blocked',
      };
      const env: Record<string, string | undefined> = {
        XCLI_AGENT_ROLE: 'admin',
      };
      addGuardRule(core, 'admin', rule);

      const result = checkGuard(core, 'do-delete-now', env);
      expect(result).toEqual({ blocked: true, message: 'contains delete blocked' });

      const result2 = checkGuard(core, 'do-insert-now', env);
      expect(result2).toBeNull();
    });
  });

  describe('checkGuard — match pattern *xxx (suffix wildcard, line 131)', () => {
    it('should match command ending with pattern', () => {
      const rule: GuardRule = {
        match: ['*.log'],
        block: ['*'],
        message: 'log commands blocked',
      };
      const env: Record<string, string | undefined> = {
        XCLI_AGENT_ROLE: 'viewer',
      };
      addGuardRule(core, 'viewer', rule);

      const result = checkGuard(core, 'something.log', env);
      expect(result).toEqual({ blocked: true, message: 'log commands blocked' });

      const result2 = checkGuard(core, 'something.click', env);
      expect(result2).toBeNull();
    });
  });

  describe('checkGuard — block pattern xxx* (prefix wildcard, line 150)', () => {
    it('should block command starting with pattern', () => {
      const rule: GuardRule = {
        match: ['*'],
        block: ['danger*'],
        message: 'danger commands blocked',
      };
      const env: Record<string, string | undefined> = {
        XCLI_AGENT_ROLE: 'restricted',
      };
      addGuardRule(core, 'restricted', rule);

      const result = checkGuard(core, 'dangerous-action', env);
      expect(result).toEqual({ blocked: true, message: 'danger commands blocked' });

      const result2 = checkGuard(core, 'safe-action', env);
      expect(result2).toBeNull();
    });
  });

  describe('checkGuard — empty match array (matches all)', () => {
    it('should match all commands when match is empty array', () => {
      const rule: GuardRule = {
        match: [],
        block: ['forbidden'],
        message: 'forbidden blocked',
      };
      const env: Record<string, string | undefined> = {
        XCLI_AGENT_ROLE: 'strict',
      };
      addGuardRule(core, 'strict', rule);

      const result = checkGuard(core, 'forbidden', env);
      expect(result).toEqual({ blocked: true, message: 'forbidden blocked' });
    });
  });
});
