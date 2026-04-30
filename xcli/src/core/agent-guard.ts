import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './constants.js';

export interface GuardRule {
  match: string[];
  block: string[];
  message: string;
}

export interface GuardConfig {
  identityKey: string;
  rules: Record<string, GuardRule>;
}

const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

let cachedConfig: GuardConfig | null = null;

function readSettingsFile(): Record<string, unknown> {
  const tryPaths = [join(process.cwd(), '.xcli', 'settings.json'), SETTINGS_FILE];

  for (const p of tryPaths) {
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(readFileSync(p, 'utf-8'));
    } catch {
      continue;
    }
  }
  return {};
}

function writeSettingsFile(data: Record<string, unknown>): void {
  const targetPath = existsSync(join(process.cwd(), '.xcli', 'settings.json'))
    ? join(process.cwd(), '.xcli', 'settings.json')
    : SETTINGS_FILE;

  if (!existsSync(join(targetPath, '..'))) {
    mkdirSync(join(targetPath, '..'), { recursive: true });
  }
  writeFileSync(targetPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  cachedConfig = null;
}

export function loadGuardConfig(): GuardConfig | null {
  if (cachedConfig) return cachedConfig;

  const raw = readSettingsFile();
  if (raw.agentGuard) {
    cachedConfig = raw.agentGuard as GuardConfig;
    return cachedConfig;
  }

  return null;
}

export function clearGuardCache(): void {
  cachedConfig = null;
}

export function setGuardIdentityKey(key: string): void {
  const settings = readSettingsFile();
  const guard = (settings.agentGuard || {}) as GuardConfig;
  guard.identityKey = key;
  settings.agentGuard = guard;
  writeSettingsFile(settings);
}

export function addGuardRule(identity: string, rule: GuardRule): void {
  const settings = readSettingsFile();
  const guard = (settings.agentGuard || {
    identityKey: 'XCLI_AGENT_ROLE',
    rules: {},
  }) as GuardConfig;
  guard.rules[identity] = rule;
  settings.agentGuard = guard;
  writeSettingsFile(settings);
}

export function removeGuardRule(identity: string): boolean {
  const settings = readSettingsFile();
  const guard = settings.agentGuard as GuardConfig | undefined;
  if (!guard?.rules?.[identity]) return false;
  delete guard.rules[identity];
  writeSettingsFile(settings);
  return true;
}

export function listGuardRules(): GuardConfig | null {
  return loadGuardConfig();
}

export function checkGuard(
  command: string,
  env: Record<string, string | undefined> = process.env
): { blocked: boolean; message: string } | null {
  const config = loadGuardConfig();
  if (!config) return null;

  const identity = env[config.identityKey];
  if (!identity) return null;

  const rule = config.rules[identity];
  if (!rule) return null;

  const isMatch =
    rule.match.length === 0 ||
    rule.match.some((pattern) => {
      if (pattern === '*') return true;
      if (pattern.startsWith('*') && pattern.endsWith('*')) {
        return command.includes(pattern.slice(1, -1));
      }
      if (pattern.startsWith('*')) {
        return command.endsWith(pattern.slice(1));
      }
      if (pattern.endsWith('*')) {
        return command.startsWith(pattern.slice(0, -1));
      }
      return command === pattern;
    });

  if (!isMatch) return null;

  const isBlocked = rule.block.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.startsWith('*') && pattern.endsWith('*')) {
      return command.includes(pattern.slice(1, -1));
    }
    if (pattern.startsWith('*')) {
      return command.endsWith(pattern.slice(1));
    }
    if (pattern.endsWith('*')) {
      return command.startsWith(pattern.slice(0, -1));
    }
    return command === pattern;
  });

  if (!isBlocked) return null;

  return { blocked: true, message: rule.message };
}
