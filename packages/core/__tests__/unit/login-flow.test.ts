import { describe, it, expect, vi, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SiteInstanceImpl, CommandError } from '../../src/protocol/plugin-protocol.js';
import type {
  CommandContext,
  StorageContext,
  LoginConfig,
} from '../../src/protocol/plugin-protocol.js';

function mockStorage(): StorageContext {
  const store = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => (store.get(key) as T) ?? null,
    set: async <T>(key: string, value: T) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    keys: async () => Array.from(store.keys()),
  };
}

function mockCtx(overrides?: Partial<CommandContext>): CommandContext {
  return {
    args: [],
    options: {},
    cwd: '/tmp',
    storage: mockStorage(),
    output: { mode: 'text' as const, showTips: false, color: false, emoji: false },
    error: () => {},
    config: {},
    site: {} as CommandContext['site'],
    cliName: 'test',
    ...overrides,
  };
}

describe('LoginConfig with persist', () => {
  it('should store login state in storage when persist is true', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const handler = vi.fn();
    const config: LoginConfig = { handler, persist: true };
    site.login(config);

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);

    expect(handler).toHaveBeenCalledTimes(1);
    const state = await storage.get<{ loggedIn: boolean; timestamp: number }>(
      '__login_state_mysite'
    );
    expect(state).not.toBeNull();
    expect(state!.loggedIn).toBe(true);
    expect(typeof state!.timestamp).toBe('number');
  });

  it('should not store login state when persist is false', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const handler = vi.fn();
    site.login({ handler, persist: false });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);

    const state = await storage.get('__login_state_mysite');
    expect(state).toBeNull();
  });

  it('should accept plain function handler (backward compat)', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const handler = vi.fn();
    site.login(handler);

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('restoreLogin', () => {
  it('should return true when state exists and isLoginCheck passes', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const isLoginCheck = vi.fn().mockResolvedValue(true);
    site.login({ handler: vi.fn(), persist: true, isLoginCheck });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(true);
    expect(isLoginCheck).toHaveBeenCalledTimes(1);
  });

  it('should return false when no state exists', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    site.login({ handler: vi.fn(), persist: true });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(false);
  });

  it('should return false when isLoginCheck fails', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const isLoginCheck = vi.fn().mockResolvedValue(false);
    site.login({ handler: vi.fn(), persist: true, isLoginCheck });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(false);
    expect(await storage.get('__login_state_mysite')).toBeNull();
  });

  it('should return true when state exists and no isLoginCheck provided', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    site.login({ handler: vi.fn(), persist: true });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(true);
  });

  it('should delegate to restore callback when provided', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const restore = vi.fn().mockResolvedValue(true);
    site.login({ handler: vi.fn(), persist: true, restore });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('should return false when state has loggedIn false', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: false, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    site.login({ handler: vi.fn(), persist: true });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(false);
  });
});

describe('Auto-guard for requiresLogin commands', () => {
  let configDir: string;

  afterEach(() => {
    if (configDir) {
      try {
        rmSync(configDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  async function createCoreWithSite(
    options: {
      siteRequiresLogin?: boolean;
      cmdRequiresLogin?: boolean;
      isLoggedIn: boolean;
      loginConfig?: LoginConfig;
    },
    storageOverride?: StorageContext
  ) {
    configDir = join(
      tmpdir(),
      `xcli-test-login-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    const { Core } = await import('../../src/core.js');
    const core = new Core({
      name: 'testcli',
      version: '1.0.0',
      description: 'test',
      configDirName: configDir,
      envPrefix: 'TEST',
      pluginDirs: [],
    });

    let siteRef: SiteInstanceImpl | null = null;

    await core.loader.loadFromFunction((xcli) => {
      const site = xcli.createSite({
        name: 'guarded',
        url: 'https://example.com',
        requiresLogin: options.siteRequiresLogin,
        isLogin: async () => options.isLoggedIn,
      });

      siteRef = site as SiteInstanceImpl;

      if (options.loginConfig) {
        (site as SiteInstanceImpl).login(options.loginConfig);
      }

      site.command('secure-cmd', {
        description: 'needs auth',
        requiresLogin: options.cmdRequiresLogin,
        handler: async () => ({ data: 'secret' }),
      });

      site.command('open-cmd', {
        description: 'no auth needed',
        handler: async () => ({ data: 'public' }),
      });
    });

    if (storageOverride && siteRef) {
      const key = '__login_state_guarded';
      await storageOverride.get(key);
      const siteStorage = siteRef.getStorage();
      const state = await storageOverride.get<{ loggedIn: boolean; timestamp: number }>(key);
      if (state) {
        await siteStorage.set(key, state);
      }
    }

    return { core, siteRef };
  }

  it('should trigger login when requiresLogin and not logged in', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: { handler: loginHandler, persist: true },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should skip login when already logged in', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: true,
      loginConfig: { handler: loginHandler, persist: true },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).not.toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should try restore before full login', async () => {
    let callCount = 0;
    const isLoginCheck = vi.fn().mockImplementation(async () => {
      callCount++;
      return callCount > 1;
    });
    const loginHandler = vi.fn();
    const restoreHandler = vi.fn().mockResolvedValue(true);

    const { core, siteRef } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: {
        handler: loginHandler,
        persist: true,
        isLoginCheck,
        restore: restoreHandler,
      },
    });

    await siteRef!.getStorage().set('__login_state_guarded', {
      loggedIn: true,
      timestamp: Date.now(),
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(isLoginCheck).toHaveBeenCalled();
    expect(restoreHandler).toHaveBeenCalled();
    expect(loginHandler).not.toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should not trigger login guard for non-requiresLogin commands', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: false,
      cmdRequiresLogin: false,
      isLoggedIn: false,
      loginConfig: { handler: loginHandler, persist: true },
    });

    const exitCode = await core.run(['open-cmd']);
    expect(loginHandler).not.toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should trigger login when site requiresLogin but command does not explicitly set it', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: { handler: loginHandler, persist: true },
    });

    const exitCode = await core.run(['open-cmd']);
    expect(loginHandler).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });
});

describe('executeLogout clears persisted state', () => {
  it('should clear login state on logout', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const loginHandler = vi.fn();
    const logoutHandler = vi.fn();
    site.login({ handler: loginHandler, persist: true });
    site.logout(logoutHandler);

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);
    expect(await storage.get('__login_state_mysite')).not.toBeNull();

    await site.executeLogout(ctx);
    expect(await storage.get('__login_state_mysite')).toBeNull();
    expect(logoutHandler).toHaveBeenCalledTimes(1);
  });
});
