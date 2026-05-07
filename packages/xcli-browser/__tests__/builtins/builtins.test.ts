import { describe, it, expect, vi } from 'vitest';
import { allBuiltins, getBuiltin } from '../../src/builtins/index.js';

vi.mock('../../src/session/browser-session-client.js', () => ({
  openSession: vi.fn().mockResolvedValue({ id: 's1', name: 'default', url: 'https://example.com' }),
  closeSession: vi.fn().mockResolvedValue(undefined),
  closeAllSessions: vi.fn().mockResolvedValue(undefined),
  listSessions: vi.fn().mockResolvedValue([]),
  htmlSession: vi.fn().mockResolvedValue('<html></html>'),
  getCookies: vi.fn().mockResolvedValue([]),
  clearCookies: vi.fn().mockResolvedValue(undefined),
  setCookie: vi.fn().mockResolvedValue(undefined),
  getLocalStorage: vi.fn().mockResolvedValue({}),
  setLocalStorage: vi.fn().mockResolvedValue(undefined),
  clearLocalStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@dyyz1993/xcli-core', () => ({
  setConfigValue: vi.fn().mockReturnValue(true),
  getConfigValue: vi.fn().mockReturnValue(undefined),
  getAllConfigKeys: vi.fn().mockReturnValue(['viewer.host', 'daemon.port']),
  CONFIG_KEY_MAP: {
    'viewer.host': { description: 'Viewer host' },
    'daemon.port': { description: 'Daemon port' },
  },
  CONFIG_FILE: '~/.xcli/config.json',
  listGuardRules: vi.fn().mockReturnValue(null),
  addGuardRule: vi.fn(),
  removeGuardRule: vi.fn().mockReturnValue(true),
  setGuardIdentityKey: vi.fn(),
  getViewerUrl: vi.fn().mockReturnValue('http://localhost:8054/viewer.html?s=s1'),
  getDaemonPort: vi.fn().mockReturnValue(8054),
}));

describe('allBuiltins', () => {
  it('should have exactly 12 builtins', () => {
    expect(allBuiltins).toHaveLength(12);
  });

  it('every builtin should have a name', () => {
    for (const b of allBuiltins) {
      expect(b.name).toBeTruthy();
      expect(typeof b.name).toBe('string');
    }
  });

  it('every builtin should have a description', () => {
    for (const b of allBuiltins) {
      expect(b.description).toBeTruthy();
    }
  });

  it('every builtin should have help info', () => {
    for (const b of allBuiltins) {
      expect(b.help).toBeDefined();
      expect(b.help.usage).toBeTruthy();
      expect(b.help.description).toBeTruthy();
      expect(Array.isArray(b.help.options)).toBe(true);
    }
  });

  it('every builtin should have an execute function', () => {
    for (const b of allBuiltins) {
      expect(typeof b.execute).toBe('function');
    }
  });

  it('builtin names should be unique', () => {
    const names = allBuiltins.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have expected builtin names', () => {
    const names = allBuiltins.map((b) => b.name);
    expect(names).toContain('daemon');
    expect(names).toContain('open');
    expect(names).toContain('sessions');
    expect(names).toContain('status');
    expect(names).toContain('html');
    expect(names).toContain('close');
    expect(names).toContain('kill');
    expect(names).toContain('cookie');
    expect(names).toContain('localStorage');
    expect(names).toContain('viewer');
    expect(names).toContain('config');
    expect(names).toContain('info');
  });
});

describe('getBuiltin', () => {
  it('should find builtin by name', () => {
    expect(getBuiltin('open')).toBeDefined();
    expect(getBuiltin('open')?.name).toBe('open');
  });

  it('should find builtin by alias', () => {
    expect(getBuiltin('d')).toBeDefined();
    expect(getBuiltin('d')?.name).toBe('daemon');
  });

  it('should find sessions by alias "ss"', () => {
    expect(getBuiltin('ss')).toBeDefined();
    expect(getBuiltin('ss')?.name).toBe('sessions');
  });

  it('should find localStorage by alias "ls"', () => {
    expect(getBuiltin('ls')).toBeDefined();
    expect(getBuiltin('ls')?.name).toBe('localStorage');
  });

  it('should return undefined for nonexistent builtin', () => {
    expect(getBuiltin('nonexistent')).toBeUndefined();
  });
});

describe('daemon builtin', () => {
  it('should have alias "d"', () => {
    const daemon = getBuiltin('daemon');
    expect(daemon?.aliases).toContain('d');
  });

  it('should have help examples', () => {
    const daemon = getBuiltin('daemon');
    expect(daemon?.help.examples).toBeDefined();
    expect(daemon?.help.examples!.length).toBeGreaterThan(0);
  });
});

describe('open builtin', () => {
  it('should have usage info', () => {
    const open = getBuiltin('open');
    expect(open?.help.usage).toContain('xcli open');
  });

  it('should have --session option', () => {
    const open = getBuiltin('open');
    const sessionOpt = open?.help.options.find((o) => o.name.includes('--session'));
    expect(sessionOpt).toBeDefined();
  });
});

describe('close builtin', () => {
  it('should have --all option', () => {
    const close = getBuiltin('close');
    const allOpt = close?.help.options.find((o) => o.name.includes('--all'));
    expect(allOpt).toBeDefined();
  });
});

describe('cookie builtin', () => {
  it('should have usage describing get|set|clear', () => {
    const cookie = getBuiltin('cookie');
    expect(cookie?.help.usage).toContain('get|set|clear');
  });

  it('should have help examples', () => {
    const cookie = getBuiltin('cookie');
    expect(cookie?.help.examples?.length).toBeGreaterThan(0);
  });
});

describe('localStorage builtin', () => {
  it('should have alias "ls"', () => {
    const ls = getBuiltin('localStorage');
    expect(ls?.aliases).toContain('ls');
  });
});

describe('config builtin', () => {
  it('should have usage describing set|get|list|guard', () => {
    const config = getBuiltin('config');
    expect(config?.help.usage).toContain('set|get|list|guard');
  });
});

describe('viewer builtin', () => {
  it('should have usage info', () => {
    const viewer = getBuiltin('viewer');
    expect(viewer?.help.usage).toContain('xcli viewer');
  });
});

describe('info builtin', () => {
  it('should have usage info', () => {
    const info = getBuiltin('info');
    expect(info?.help.usage).toContain('xcli info');
  });

  it('should have --json option', () => {
    const info = getBuiltin('info');
    const jsonOpt = info?.help.options.find((o) => o.name === '--json');
    expect(jsonOpt).toBeDefined();
  });
});
