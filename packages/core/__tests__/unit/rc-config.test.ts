import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getEffectiveValue,
  getAllConfigKeys,
  getViewerHost,
  getChromiumPath,
  getDaemonPort,
  getViewerUrl,
  CONFIG_KEY_MAP,
} from '../../src/rc-config.js';
import { Core } from '../../src/core.js';

let tmpDir: string;
let core: Core;

function createCore() {
  return new Core({
    name: 'test',
    version: '0.0.1',
    description: 'test',
    configDirName: '.test-xcli',
    envPrefix: 'XCLI',
    pluginDirs: [],
  });
}

const envVarsToClean = ['XCLI_VIEWER_HOST', 'XCLI_CHROMIUM_PATH', 'XCLI_DAEMON_PORT'];

describe('rc-config', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'xcli-rc-'));
    core = createCore();
    (core as unknown as { configDir: string }).configDir = tmpDir;
    envVarsToClean.forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    envVarsToClean.forEach((k) => delete process.env[k]);
  });

  describe('loadConfig()', () => {
    it('should return empty object when config file does not exist', () => {
      expect(loadConfig(core)).toEqual({});
    });

    it('should load config from file', () => {
      const config = { viewer: { host: 'http://localhost:3000' } };
      writeFileSync(join(tmpDir, 'config.json'), JSON.stringify(config), 'utf-8');
      expect(loadConfig(core)).toEqual(config);
    });

    it('should return empty object for corrupted JSON', () => {
      writeFileSync(join(tmpDir, 'config.json'), '{bad', 'utf-8');
      expect(loadConfig(core)).toEqual({});
    });
  });

  describe('saveConfig()', () => {
    it('should save config and create directory if needed', () => {
      const dir = join(tmpDir, 'sub', 'dir');
      (core as unknown as { configDir: string }).configDir = dir;
      saveConfig(core, { daemon: { port: 9090 } });
      const loaded = loadConfig(core);
      expect(loaded.daemon?.port).toBe(9090);
    });

    it('should overwrite existing config', () => {
      saveConfig(core, { viewer: { host: 'a' } });
      saveConfig(core, { viewer: { host: 'b' } });
      expect(loadConfig(core).viewer?.host).toBe('b');
    });
  });

  describe('getConfigValue()', () => {
    it('should get nested value', () => {
      saveConfig(core, { viewer: { host: 'http://x.com' } });
      expect(getConfigValue(core, 'viewer.host')).toBe('http://x.com');
    });

    it('should return undefined for unknown key', () => {
      expect(getConfigValue(core, 'unknown.key')).toBeUndefined();
    });

    it('should return undefined when config is empty', () => {
      expect(getConfigValue(core, 'viewer.host')).toBeUndefined();
    });
  });

  describe('setConfigValue()', () => {
    it('should set string value', () => {
      expect(setConfigValue(core, 'viewer.host', 'http://new.com')).toBe(true);
      expect(getConfigValue(core, 'viewer.host')).toBe('http://new.com');
    });

    it('should set daemon.port as number', () => {
      expect(setConfigValue(core, 'daemon.port', '8080')).toBe(true);
      expect(getConfigValue(core, 'daemon.port')).toBe(8080);
    });

    it('should reject invalid daemon.port', () => {
      expect(setConfigValue(core, 'daemon.port', 'not-a-number')).toBe(false);
      expect(setConfigValue(core, 'daemon.port', '0')).toBe(false);
      expect(setConfigValue(core, 'daemon.port', '70000')).toBe(false);
    });

    it('should return false for unknown key', () => {
      expect(setConfigValue(core, 'unknown.key', 'val')).toBe(false);
    });

    it('should preserve existing keys when setting new one', () => {
      setConfigValue(core, 'viewer.host', 'http://a.com');
      setConfigValue(core, 'daemon.port', '3000');
      expect(getConfigValue(core, 'viewer.host')).toBe('http://a.com');
      expect(getConfigValue(core, 'daemon.port')).toBe(3000);
    });
  });

  describe('getEffectiveValue()', () => {
    it('should return config value when no env override', () => {
      setConfigValue(core, 'viewer.host', 'http://cfg.com');
      expect(getEffectiveValue(core, 'viewer.host')).toBe('http://cfg.com');
    });

    it('should prefer env var over config', () => {
      setConfigValue(core, 'viewer.host', 'http://cfg.com');
      process.env.XCLI_VIEWER_HOST = 'http://env.com';
      expect(getEffectiveValue(core, 'viewer.host')).toBe('http://env.com');
    });

    it('should return undefined when neither set', () => {
      expect(getEffectiveValue(core, 'viewer.host')).toBeUndefined();
    });

    it('should parse daemon.port from env as number', () => {
      process.env.XCLI_DAEMON_PORT = '9999';
      expect(getEffectiveValue(core, 'daemon.port')).toBe(9999);
    });

    it('should return env value even when invalid for port (env wins)', () => {
      setConfigValue(core, 'daemon.port', '3000');
      process.env.XCLI_DAEMON_PORT = 'abc';
      expect(getEffectiveValue(core, 'daemon.port')).toBe('abc');
    });
  });

  describe('getAllConfigKeys()', () => {
    it('should return all defined keys', () => {
      const keys = getAllConfigKeys();
      expect(keys).toEqual(Object.keys(CONFIG_KEY_MAP));
      expect(keys).toContain('viewer.host');
      expect(keys).toContain('browser.executablePath');
      expect(keys).toContain('daemon.port');
    });
  });

  describe('convenience methods', () => {
    it('getViewerHost() should return empty string by default', () => {
      expect(getViewerHost(core)).toBe('');
    });

    it('getViewerHost() should return host from config', () => {
      setConfigValue(core, 'viewer.host', 'http://viewer.example.com');
      expect(getViewerHost(core)).toBe('http://viewer.example.com');
    });

    it('getChromiumPath() should return default when not set', () => {
      expect(getChromiumPath(core)).toBe('/Applications/Chromium.app/Contents/MacOS/Chromium');
    });

    it('getChromiumPath() should return config value', () => {
      setConfigValue(core, 'browser.executablePath', '/usr/bin/chromium');
      expect(getChromiumPath(core)).toBe('/usr/bin/chromium');
    });

    it('getDaemonPort() should return default 8054', () => {
      expect(getDaemonPort(core)).toBe(8054);
    });

    it('getDaemonPort() should return configured port', () => {
      setConfigValue(core, 'daemon.port', '9090');
      expect(getDaemonPort(core)).toBe(9090);
    });

    it('getViewerUrl() should construct url with host', () => {
      setConfigValue(core, 'viewer.host', 'http://my.host');
      expect(getViewerUrl(core, 's1', 8054)).toBe('http://my.host/viewer.html?s=s1');
    });

    it('getViewerUrl() should construct url with host without protocol', () => {
      setConfigValue(core, 'viewer.host', 'my.host:8443');
      expect(getViewerUrl(core, 's2', 8054)).toBe('http://my.host:8443/viewer.html?s=s2');
    });

    it('getViewerUrl() should fallback to localhost with daemon port', () => {
      expect(getViewerUrl(core, 's3', 9090)).toBe('http://localhost:9090/viewer.html?s=s3');
    });
  });
});
