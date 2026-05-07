import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createPaths,
  getEnvVar,
  getDefaultPort,
  CONFIG_DIR,
  SESSION_DIR,
  DAEMON_CONFIG_PATH,
  DAEMON_SOCKET_PATH,
  DEFAULT_CHROMIUM_PATH,
  DAEMON_PORT,
} from '../../src/constants.js';
import type { CoreConfig } from '../../src/core.js';
import { join } from 'path';
import { homedir } from 'os';

function makeConfig(overrides?: Partial<CoreConfig>): CoreConfig {
  return {
    name: 'test',
    version: '0.0.1',
    description: 'test',
    configDirName: '.xcli',
    envPrefix: 'XCLI',
    pluginDirs: [],
    ...overrides,
  };
}

describe('constants — createPaths', () => {
  it('should create paths with custom configDirName', () => {
    const config = makeConfig({ configDirName: '.my-cli' });
    const paths = createPaths(config);
    expect(paths.configDir).toBe(join(homedir(), '.my-cli'));
    expect(paths.sessionDir).toBe(join(homedir(), '.my-cli', 'sessions'));
    expect(paths.storageDir).toBe(join(homedir(), '.my-cli', 'storage'));
    expect(paths.daemonConfigPath).toBe(join(homedir(), '.my-cli', 'sessions', 'daemon.json'));
    expect(paths.daemonSocketPath).toBe(join(homedir(), '.my-cli', 'sessions', 'daemon.sock'));
  });

  it('should use default configDirName', () => {
    const config = makeConfig();
    const paths = createPaths(config);
    expect(paths.configDir).toBe(join(homedir(), '.xcli'));
  });
});

describe('constants — getEnvVar', () => {
  it('should construct env var with prefix', () => {
    const config = makeConfig({ envPrefix: 'MYAPP' });
    expect(getEnvVar(config, 'PORT')).toBe('MYAPP_PORT');
  });

  it('should use default prefix', () => {
    const config = makeConfig();
    expect(getEnvVar(config, 'DEBUG')).toBe('XCLI_DEBUG');
  });
});

describe('constants — getDefaultPort', () => {
  const origEnv = process.env.XCLI_DAEMON_PORT;

  beforeEach(() => {
    delete process.env.XCLI_DAEMON_PORT;
  });

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.XCLI_DAEMON_PORT = origEnv;
    } else {
      delete process.env.XCLI_DAEMON_PORT;
    }
  });

  it('should return default port when env var not set', () => {
    const config = makeConfig();
    expect(getDefaultPort(config)).toBe(8054);
  });

  it('should return port from env var when set', () => {
    process.env.XCLI_DAEMON_PORT = '9999';
    const config = makeConfig();
    expect(getDefaultPort(config)).toBe(9999);
  });

  it('should use custom prefix for env var', () => {
    process.env.MYAPP_DAEMON_PORT = '3000';
    const config = makeConfig({ envPrefix: 'MYAPP' });
    expect(getDefaultPort(config)).toBe(3000);
    delete process.env.MYAPP_DAEMON_PORT;
  });
});

describe('constants — deprecated exports', () => {
  it('should export CONFIG_DIR with default path', () => {
    expect(CONFIG_DIR).toBe(join(homedir(), '.xcli'));
  });

  it('should export SESSION_DIR under CONFIG_DIR', () => {
    expect(SESSION_DIR).toBe(join(CONFIG_DIR, 'sessions'));
  });

  it('should export DAEMON_CONFIG_PATH under SESSION_DIR', () => {
    expect(DAEMON_CONFIG_PATH).toBe(join(SESSION_DIR, 'daemon.json'));
  });

  it('should export DAEMON_SOCKET_PATH under SESSION_DIR', () => {
    expect(DAEMON_SOCKET_PATH).toBe(join(SESSION_DIR, 'daemon.sock'));
  });

  it('should export DEFAULT_CHROMIUM_PATH with default', () => {
    expect(DEFAULT_CHROMIUM_PATH).toBe('/Applications/Chromium.app/Contents/MacOS/Chromium');
  });

  it('should export DAEMON_PORT with default value', () => {
    expect(DAEMON_PORT).toBe(8054);
  });
});
