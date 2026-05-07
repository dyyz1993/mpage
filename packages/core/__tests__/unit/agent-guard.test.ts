import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadGuardConfig,
  checkGuard,
  addGuardRule,
  removeGuardRule,
  listGuardRules,
  setGuardIdentityKey,
  clearGuardCache,
} from '../../src/agent-guard.js';
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

function writeSettings(dir: string, data: Record<string, unknown>) {
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(data, null, 2), 'utf-8');
}

describe('agent-guard', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'xcli-guard-'));
    core = createCore(tmpDir);
    clearGuardCache();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadGuardConfig()', () => {
    it('should return null when no settings file', () => {
      expect(loadGuardConfig(core)).toBeNull();
    });

    it('should return null when settings has no agentGuard', () => {
      writeSettings(tmpDir, { other: true });
      expect(loadGuardConfig(core)).toBeNull();
    });

    it('should load guard config from settings', () => {
      const config = {
        identityKey: 'ROLE',
        rules: {
          admin: { match: ['*'], block: [], message: '' },
        },
      };
      writeSettings(tmpDir, { agentGuard: config });
      const loaded = loadGuardConfig(core);
      expect(loaded).not.toBeNull();
      expect(loaded!.identityKey).toBe('ROLE');
      expect(loaded!.rules.admin).toBeDefined();
    });

    it('should cache config on second call', () => {
      writeSettings(tmpDir, {
        agentGuard: { identityKey: 'X', rules: {} },
      });
      const first = loadGuardConfig(core);
      writeSettings(tmpDir, {
        agentGuard: { identityKey: 'Y', rules: {} },
      });
      const second = loadGuardConfig(core);
      expect(first).toBe(second);
    });

    it('should ignore corrupted settings.json', () => {
      writeFileSync(join(tmpDir, 'settings.json'), '{bad', 'utf-8');
      expect(loadGuardConfig(core)).toBeNull();
    });
  });

  describe('checkGuard()', () => {
    const blockRule: GuardRule = {
      match: ['scrape', 'navigate'],
      block: ['scrape'],
      message: 'scrape is blocked',
    };

    const allowAllRule: GuardRule = {
      match: ['*'],
      block: [],
      message: '',
    };

    const wildcardRule: GuardRule = {
      match: ['nav*'],
      block: ['*delete*'],
      message: 'delete operations blocked',
    };

    function setupGuard(identityKey: string, identity: string, rule: GuardRule) {
      writeSettings(tmpDir, {
        agentGuard: {
          identityKey,
          rules: { [identity]: rule },
        },
      });
      clearGuardCache();
    }

    it('should return null when no guard config', () => {
      expect(checkGuard(core, 'scrape')).toBeNull();
    });

    it('should return null when identity key not set in env', () => {
      setupGuard('ROLE', 'admin', blockRule);
      delete process.env.ROLE;
      expect(checkGuard(core, 'scrape')).toBeNull();
    });

    it('should return null when no rule for identity', () => {
      setupGuard('ROLE', 'admin', blockRule);
      process.env.ROLE = 'unknown';
      expect(checkGuard(core, 'scrape')).toBeNull();
      delete process.env.ROLE;
    });

    it('should return null when command does not match', () => {
      setupGuard('ROLE', 'admin', blockRule);
      process.env.ROLE = 'admin';
      expect(checkGuard(core, 'click')).toBeNull();
      delete process.env.ROLE;
    });

    it('should block matching command', () => {
      setupGuard('ROLE', 'admin', blockRule);
      process.env.ROLE = 'admin';
      const result = checkGuard(core, 'scrape');
      expect(result).toEqual({ blocked: true, message: 'scrape is blocked' });
      delete process.env.ROLE;
    });

    it('should allow matched command not in block list', () => {
      setupGuard('ROLE', 'admin', blockRule);
      process.env.ROLE = 'admin';
      expect(checkGuard(core, 'navigate')).toBeNull();
      delete process.env.ROLE;
    });

    it('should allow all when block is empty', () => {
      setupGuard('ROLE', 'user', allowAllRule);
      process.env.ROLE = 'user';
      expect(checkGuard(core, 'anything')).toBeNull();
      delete process.env.ROLE;
    });

    it('should match wildcard prefix pattern', () => {
      setupGuard('ROLE', 'bot', wildcardRule);
      process.env.ROLE = 'bot';
      expect(checkGuard(core, 'navigate')).toBeNull();
      expect(checkGuard(core, 'nav-something')).toBeNull();
      expect(checkGuard(core, 'click')).toBeNull();
      delete process.env.ROLE;
    });

    it('should match wildcard contains pattern in block', () => {
      const rule: GuardRule = {
        match: ['*'],
        block: ['*delete*'],
        message: 'delete operations blocked',
      };
      setupGuard('ROLE', 'bot', rule);
      process.env.ROLE = 'bot';
      const result = checkGuard(core, 'do-delete-now');
      expect(result).toEqual({ blocked: true, message: 'delete operations blocked' });
      delete process.env.ROLE;
    });

    it('should use custom env object', () => {
      setupGuard('MY_KEY', 'worker', blockRule);
      const result = checkGuard(core, 'scrape', { MY_KEY: 'worker' });
      expect(result).toEqual({ blocked: true, message: 'scrape is blocked' });
    });

    it('should match exact command', () => {
      const rule: GuardRule = {
        match: ['exact-cmd'],
        block: ['exact-cmd'],
        message: 'blocked',
      };
      setupGuard('R', 'x', rule);
      expect(checkGuard(core, 'exact-cmd', { R: 'x' })).toEqual({
        blocked: true,
        message: 'blocked',
      });
      expect(checkGuard(core, 'exact-cmd-other', { R: 'x' })).toBeNull();
    });

    it('should match wildcard suffix pattern', () => {
      const rule: GuardRule = {
        match: ['*'],
        block: ['*.log'],
        message: 'log blocked',
      };
      setupGuard('R', 'x', rule);
      expect(checkGuard(core, 'something.log', { R: 'x' })).toEqual({
        blocked: true,
        message: 'log blocked',
      });
      expect(checkGuard(core, 'something.click', { R: 'x' })).toBeNull();
    });
  });

  describe('addGuardRule()', () => {
    it('should add rule and persist to settings', () => {
      addGuardRule(core, 'admin', {
        match: ['*'],
        block: ['delete'],
        message: 'no delete',
      });
      const config = loadGuardConfig(core);
      expect(config).not.toBeNull();
      expect(config!.rules.admin).toBeDefined();
      expect(config!.rules.admin.block).toContain('delete');
    });

    it('should create guard config if not exists', () => {
      addGuardRule(core, 'viewer', {
        match: ['view'],
        block: [],
        message: '',
      });
      const config = loadGuardConfig(core);
      expect(config).not.toBeNull();
      expect(config!.rules.viewer).toBeDefined();
    });

    it('should overwrite existing rule', () => {
      addGuardRule(core, 'role', {
        match: ['a'],
        block: [],
        message: 'v1',
      });
      addGuardRule(core, 'role', {
        match: ['b'],
        block: ['b'],
        message: 'v2',
      });
      const config = loadGuardConfig(core);
      expect(config!.rules.role.match).toEqual(['b']);
      expect(config!.rules.role.message).toBe('v2');
    });
  });

  describe('removeGuardRule()', () => {
    it('should remove existing rule', () => {
      addGuardRule(core, 'target', {
        match: ['*'],
        block: [],
        message: '',
      });
      expect(removeGuardRule(core, 'target')).toBe(true);
      const config = loadGuardConfig(core);
      expect(config!.rules.target).toBeUndefined();
    });

    it('should return false for non-existent rule', () => {
      expect(removeGuardRule(core, 'ghost')).toBe(false);
    });
  });

  describe('listGuardRules()', () => {
    it('should return null when no config', () => {
      expect(listGuardRules(core)).toBeNull();
    });

    it('should return config with rules', () => {
      addGuardRule(core, 'a', { match: ['*'], block: [], message: '' });
      addGuardRule(core, 'b', { match: ['x'], block: ['x'], message: 'no' });
      const rules = listGuardRules(core);
      expect(Object.keys(rules!.rules)).toHaveLength(2);
    });
  });

  describe('setGuardIdentityKey()', () => {
    it('should set identity key', () => {
      setGuardIdentityKey(core, 'CUSTOM_ROLE');
      const config = loadGuardConfig(core);
      expect(config!.identityKey).toBe('CUSTOM_ROLE');
    });

    it('should preserve existing rules when setting identity key', () => {
      addGuardRule(core, 'admin', { match: ['*'], block: [], message: '' });
      setGuardIdentityKey(core, 'NEW_KEY');
      const config = loadGuardConfig(core);
      expect(config!.identityKey).toBe('NEW_KEY');
      expect(config!.rules.admin).toBeDefined();
    });
  });

  describe('clearGuardCache()', () => {
    it('should force reload on next call', () => {
      writeSettings(tmpDir, {
        agentGuard: { identityKey: 'V1', rules: {} },
      });
      const first = loadGuardConfig(core);
      writeSettings(tmpDir, {
        agentGuard: { identityKey: 'V2', rules: {} },
      });
      clearGuardCache();
      const second = loadGuardConfig(core);
      expect(second!.identityKey).toBe('V2');
    });
  });

  describe('default behavior with no rules', () => {
    it('should return null for any command', () => {
      expect(checkGuard(core, 'anything')).toBeNull();
    });
  });
});
