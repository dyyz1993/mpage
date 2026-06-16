/* eslint-disable require-await */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Shared JSON file storage helper ───

function loadJson(filePath: string): Record<string, unknown> {
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveJson(filePath: string, data: Record<string, unknown>): void {
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Plugin-scoped persistent storage ───
// ~/.{cli}/storage/{pluginId}.json

export class PluginStorage {
  private filePath: string;
  private data: Record<string, unknown>;

  constructor(pluginId: string, storageDir: string) {
    mkdirSync(storageDir, { recursive: true });
    this.filePath = join(storageDir, `${pluginId}.json`);
    this.data = loadJson(this.filePath);
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.data[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data[key] = value;
    saveJson(this.filePath, this.data);
  }

  async delete(key: string): Promise<void> {
    if (key in this.data) {
      delete this.data[key];
      saveJson(this.filePath, this.data);
    }
  }

  async clear(): Promise<void> {
    this.data = {};
    saveJson(this.filePath, this.data);
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }
}

// ─── Global shared storage ───
// ~/.{cli}/global.json — all plugins share this

export class GlobalStorage {
  private filePath: string;
  private data: Record<string, unknown>;

  constructor(configDir: string) {
    this.filePath = join(configDir, 'global.json');
    this.data = loadJson(this.filePath);
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.data[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data[key] = value;
    saveJson(this.filePath, this.data);
  }

  async delete(key: string): Promise<void> {
    if (key in this.data) {
      delete this.data[key];
      saveJson(this.filePath, this.data);
    }
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }
}

// ─── Cache storage with expiry ───
// ~/.{cli}/cache/{pluginId}/{key}.json — { data, createdAt, maxAge }

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  maxAge: number;
}

export class CacheStorage {
  private dir: string;

  constructor(pluginId: string, cacheDir: string) {
    this.dir = join(cacheDir, pluginId);
    mkdirSync(this.dir, { recursive: true });
  }

  async get<T>(key: string, maxAge?: number): Promise<T | null> {
    const filePath = join(this.dir, `${key}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const entry = loadJson(filePath) as unknown as CacheEntry<T>;
      const effectiveMaxAge = maxAge ?? entry.maxAge;
      if (Date.now() - entry.createdAt > effectiveMaxAge) {
        rmSync(filePath, { force: true });
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, maxAge: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      createdAt: Date.now(),
      maxAge,
    };
    const filePath = join(this.dir, `${key}.json`);
    saveJson(filePath, entry as unknown as Record<string, unknown>);
  }

  async delete(key: string): Promise<void> {
    rmSync(join(this.dir, `${key}.json`), { force: true });
  }

  async clear(): Promise<void> {
    if (existsSync(this.dir)) {
      const files = readdirSync(this.dir);
      for (const file of files) {
        rmSync(join(this.dir, file), { force: true });
      }
    }
  }
}

// ─── Temporary file storage (process-scoped) ───
// /tmp/{cli}-{pid}/{pluginId}/

export class TmpStorage {
  private dir: string;

  constructor(cliName: string, pluginId: string) {
    this.dir = join(tmpdir(), `${cliName}-${process.pid}`, pluginId);
    mkdirSync(this.dir, { recursive: true });
  }

  path(filename: string): string {
    return join(this.dir, filename);
  }

  async read(filename: string): Promise<Buffer> {
    return readFileSync(this.path(filename));
  }

  async write(filename: string, data: Buffer | string): Promise<void> {
    writeFileSync(this.path(filename), data);
  }

  async clean(): Promise<void> {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

// ─── Composite StorageContext ───
// Implements full StorageContext: top-level (backward-compat) + layered (plugin/global/cache/tmp)

export class CompositeStorage {
  plugin: PluginStorage;
  global: GlobalStorage;
  cache: CacheStorage;
  tmp: TmpStorage;

  constructor(pluginId: string, configDir: string, cliName: string) {
    const storageDir = join(configDir, 'storage');
    const cacheDir = join(configDir, 'cache');

    this.plugin = new PluginStorage(pluginId, storageDir);
    this.global = new GlobalStorage(configDir);
    this.cache = new CacheStorage(pluginId, cacheDir);
    this.tmp = new TmpStorage(cliName, pluginId);
  }

  // ─── Top-level delegates to plugin (backward-compatible) ───

  async get<T>(key: string): Promise<T | null> {
    return this.plugin.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.plugin.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.plugin.delete(key);
  }

  async clear(): Promise<void> {
    return this.plugin.clear();
  }

  async keys(): Promise<string[]> {
    return this.plugin.keys();
  }
}
