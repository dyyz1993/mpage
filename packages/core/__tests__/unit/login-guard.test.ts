import { describe, it, expect, vi, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SiteInstanceImpl } from '../../src/protocol/plugin-protocol.js';
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
    error: vi.fn(),
    config: {},
    site: {} as CommandContext['site'],
    cliName: 'test',
    ...overrides,
  };
}

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
    isLoginCheck?: () => Promise<boolean>;
  },
  storageOverride?: StorageContext
) {
  configDir = join(
    tmpdir(),
    `xcli-test-guard-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
      isLogin: options.isLoginCheck
        ? async () => options.isLoginCheck!()
        : async () => options.isLoggedIn,
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
    const siteStorage = siteRef.getStorage();
    const state = await storageOverride.get<{ loggedIn: boolean; timestamp: number }>(key);
    if (state) {
      await siteStorage.set(key, state);
    }
  }

  return { core, siteRef };
}

describe('Login guard - requiresLogin triggers login', () => {
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

  it('should skip guard for non-requiresLogin commands on non-requiresLogin site', async () => {
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
});

describe('Login guard - persistHandler', () => {
  it('should call persistHandler after login', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const handler = vi.fn();
    const persistHandler = vi.fn();
    site.login({ handler, persistHandler });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(persistHandler).toHaveBeenCalledTimes(1);
  });

  it('should not call persistHandler when not set', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const handler = vi.fn();
    site.login({ handler });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    await site.executeLogin(ctx);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Login guard - restore from persisted state', () => {
  it('should restore successfully from persisted state', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const restore = vi.fn().mockResolvedValue(true);
    const isLoginCheck = vi.fn().mockResolvedValue(true);
    site.login({ handler: vi.fn(), persist: true, restore, isLoginCheck });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(isLoginCheck).toHaveBeenCalledTimes(1);
  });

  it('should fail restore when isLoginCheck fails after restore', async () => {
    const storage = mockStorage();
    await storage.set('__login_state_mysite', { loggedIn: true, timestamp: Date.now() });

    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const restore = vi.fn().mockResolvedValue(true);
    const isLoginCheck = vi.fn().mockResolvedValue(false);
    site.login({ handler: vi.fn(), persist: true, restore, isLoginCheck });

    const ctx = mockCtx({ site: site as CommandContext['site'] });
    const result = await site.restoreLogin(ctx);

    expect(result).toBe(false);
  });
});

describe('Login guard - isLoginCheck custom check', () => {
  it('should use isLoginCheck from LoginConfig instead of site.isLogin', async () => {
    const storage = mockStorage();
    const siteIsLogin = vi.fn().mockResolvedValue(false);
    const configIsLoginCheck = vi.fn().mockResolvedValue(true);

    const site = new SiteInstanceImpl(
      { name: 'mysite', requiresLogin: true, isLogin: siteIsLogin },
      storage
    );
    site.login({ handler: vi.fn(), isLoginCheck: configIsLoginCheck });

    const result = await site.isLoggedIn();

    expect(result).toBe(true);
    expect(configIsLoginCheck).toHaveBeenCalledTimes(1);
    expect(siteIsLogin).not.toHaveBeenCalled();
  });

  it('should return false when isLoginCheck returns false', async () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'mysite', requiresLogin: true }, storage);
    const isLoginCheck = vi.fn().mockResolvedValue(false);
    site.login({ handler: vi.fn(), isLoginCheck });

    const result = await site.isLoggedIn();

    expect(result).toBe(false);
  });
});

describe('Login guard - post-login verification', () => {
  it('should fail with exitCode=1 if login does not result in logged-in state', async () => {
    let checkCount = 0;
    const isLoginCheck = vi.fn().mockImplementation(async () => {
      checkCount++;
      return false;
    });
    const loginHandler = vi.fn();

    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: {
        handler: loginHandler,
        isLoginCheck,
      },
      isLoginCheck: async () => {
        return false;
      },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).toHaveBeenCalled();
    expect(exitCode).toBe(1);
  });
});

describe('Login guard - auto:false skips auto-trigger', () => {
  it('should not auto-trigger login when auto is false', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: {
        handler: loginHandler,
        auto: false,
      },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).not.toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should auto-trigger login when auto is true', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: {
        handler: loginHandler,
        auto: true,
      },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('should auto-trigger login when auto is not set (default)', async () => {
    const loginHandler = vi.fn();
    const { core } = await createCoreWithSite({
      siteRequiresLogin: true,
      cmdRequiresLogin: true,
      isLoggedIn: false,
      loginConfig: { handler: loginHandler },
    });

    const exitCode = await core.run(['secure-cmd']);
    expect(loginHandler).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });
});

describe('Login guard - restore before login', () => {
  it('should try restore before full login via pipeline', async () => {
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
});
