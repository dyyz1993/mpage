import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_DIR } from './constants.js';

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

export function loadConfig(): RcConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as RcConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: RcConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function getConfigValue(key: string): string | number | undefined {
  const mapping = CONFIG_KEY_MAP[key];
  if (!mapping) return undefined;
  const config = loadConfig();
  let current: unknown = config;
  for (const segment of mapping.path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as string | number | undefined;
}

export function setConfigValue(key: string, value: string): boolean {
  const mapping = CONFIG_KEY_MAP[key];
  if (!mapping) return false;

  const config = loadConfig();
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

  saveConfig(config);
  return true;
}

export function getEffectiveValue(key: string): string | number | undefined {
  const envMap: Record<string, string> = {
    'viewer.host': 'XCLI_VIEWER_HOST',
    'browser.executablePath': 'XCLI_CHROMIUM_PATH',
    'daemon.port': 'XCLI_DAEMON_PORT',
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

  return getConfigValue(key);
}

export function getViewerHost(): string {
  return (getEffectiveValue('viewer.host') as string) || '';
}

export function getChromiumPath(): string {
  return (
    (getEffectiveValue('browser.executablePath') as string) ||
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  );
}

export function getDaemonPort(): number {
  const val = getEffectiveValue('daemon.port');
  if (typeof val === 'number') return val;
  const parsed = parseInt(String(val || '8054'), 10);
  return isNaN(parsed) ? 8054 : parsed;
}

export function getViewerUrl(sessionId: string, daemonPort: number): string {
  const host = getViewerHost();
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
