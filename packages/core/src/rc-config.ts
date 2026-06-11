import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_DIR } from './constants.js';

/** @deprecated Use path.join(core.configDir, 'config.json') instead */
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface RcConfig {
  viewer?: {
    host?: string;
  };
  browser?: {
    executablePath?: string;
  };
  daemon?: {
    port?: number;
  };
}

/**
 * Minimal config source — accepts either a Core instance or
 * a plain object with configDir and optional envPrefix.
 *
 * Core is structurally compatible (has configDir + envPrefix getter).
 */
export interface ConfigSource {
  configDir: string;
  envPrefix?: string;
}

export const CONFIG_KEY_MAP: Record<string, { path: string[]; description: string }> = {
  'viewer.host': {
    path: ['viewer', 'host'],
    description: 'Viewer URL host (e.g., https://viewer.example.com:8443)',
  },
  'browser.executablePath': {
    path: ['browser', 'executablePath'],
    description:
      'Browser executable path (e.g., /Applications/Chromium.app/Contents/MacOS/Chromium)',
  },
  'daemon.port': {
    path: ['daemon', 'port'],
    description: 'Daemon HTTP port (default: 8054)',
  },
};

function configFile(configDir: string): string {
  return path.join(configDir, 'config.json');
}

/**
 * Load config from a config source.
 *
 * @param source - Either a Core instance or an object with configDir
 */
export function loadConfig(source: ConfigSource): RcConfig {
  const file = configFile(source.configDir);
  try {
    if (!fs.existsSync(file)) {
      return {};
    }
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as RcConfig;
  } catch {
    return {};
  }
}

/**
 * Save config to a config source's directory.
 *
 * @param source - Either a Core instance or an object with configDir
 * @param config - The config object to persist
 */
export function saveConfig(source: ConfigSource, config: RcConfig): void {
  const dir = source.configDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configFile(dir), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Get a config value by dotted key (e.g. "viewer.host").
 *
 * @param source - Either a Core instance or an object with configDir
 * @param key - Dotted config key registered in CONFIG_KEY_MAP
 */
export function getConfigValue(source: ConfigSource, key: string): string | number | undefined {
  const mapping = CONFIG_KEY_MAP[key];
  if (!mapping) return undefined;
  const config = loadConfig(source);
  let current: unknown = config;
  for (const segment of mapping.path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as string | number | undefined;
}

/**
 * Set a config value by dotted key (e.g. "viewer.host").
 * Returns true on success, false if the key is not registered.
 *
 * @param source - Either a Core instance or an object with configDir
 * @param key - Dotted config key registered in CONFIG_KEY_MAP
 * @param value - Value to persist
 */
export function setConfigValue(source: ConfigSource, key: string, value: string): boolean {
  const mapping = CONFIG_KEY_MAP[key];
  if (!mapping) return false;

  const config = loadConfig(source);
  let current: Record<string, unknown> = config as Record<string, unknown>;

  for (let i = 0; i < mapping.path.length - 1; i++) {
    const segment = mapping.path[i];
    if (!current[segment] || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  const lastKey = mapping.path[mapping.path.length - 1];

  if (key === 'daemon.port') {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0 || num > 65535) return false;
    current[lastKey] = num;
  } else {
    current[lastKey] = value;
  }

  saveConfig(source, config);
  return true;
}

/**
 * Get a config value, checking environment variable first.
 *
 * Environment variable names follow the pattern `<ENV_PREFIX>_<UPPER_KEY>`.
 *
 * @param source - Either a Core instance or an object with configDir+envPrefix
 * @param key - Dotted config key registered in CONFIG_KEY_MAP
 */
export function getEffectiveValue(source: ConfigSource, key: string): string | number | undefined {
  const prefix = source.envPrefix ?? '';
  const envMap: Record<string, string> = {
    'viewer.host': `${prefix}_VIEWER_HOST`,
    'browser.executablePath': `${prefix}_CHROMIUM_PATH`,
    'daemon.port': `${prefix}_DAEMON_PORT`,
  };

  const envKey = envMap[key];
  if (envKey && process.env[envKey]) {
    const val = process.env[envKey] as string;
    if (key === 'daemon.port') {
      const num = parseInt(val, 10);
      if (!isNaN(num)) return num;
    }
    return val;
  }

  return getConfigValue(source, key);
}

export function getViewerHost(source: ConfigSource): string {
  return (getEffectiveValue(source, 'viewer.host') as string) || '';
}

export function getChromiumPath(source: ConfigSource): string {
  return (
    (getEffectiveValue(source, 'browser.executablePath') as string) ||
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  );
}

export function getDaemonPort(source: ConfigSource): number {
  const val = getEffectiveValue(source, 'daemon.port');
  if (typeof val === 'number') return val;
  const parsed = parseInt(String(val || '8054'), 10);
  return isNaN(parsed) ? 8054 : parsed;
}

export function getViewerUrl(source: ConfigSource, sessionId: string, daemonPort: number): string {
  const host = getViewerHost(source);
  if (host) {
    return host.includes('://')
      ? `${host}/viewer.html?s=${sessionId}`
      : `http://${host}/viewer.html?s=${sessionId}`;
  }
  return `http://localhost:${daemonPort}/viewer.html?s=${sessionId}`;
}

export function getAllConfigKeys(): string[] {
  return Object.keys(CONFIG_KEY_MAP);
}
