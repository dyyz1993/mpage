import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TEMPLATES } from '../../src/commands/create';

vi.mock('fs', () => ({
  mkdirSync: vi.fn(() => ''),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/tmp/test-home'),
}));

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { createCommand } from '../../src/commands/create';

describe('create command', () => {
  describe('TEMPLATES', () => {
    const templateNames = ['static', 'dynamic', 'login', 'api'];

    it('should have 4 templates', () => {
      expect(Object.keys(TEMPLATES)).toEqual(templateNames);
    });

    it.each(templateNames)('should generate valid code for "%s" template', (name) => {
      const code = TEMPLATES[name]('my-plugin');
      expect(code).toContain('import');
      expect(code).toContain('export default function');
      expect(code).toContain("name: 'my-plugin'");
    });

    it.each(templateNames)('should include ok() in "%s" template', (name) => {
      const code = TEMPLATES[name]('my-plugin');
      expect(code).toContain('ok(');
    });

    it.each(['static', 'dynamic', 'login'])('should include fail() in "%s" template', (name) => {
      const code = TEMPLATES[name]('my-plugin');
      expect(code).toContain('fail(');
    });

    it('api template imports fail but uses ok only', () => {
      const code = TEMPLATES.api('my-plugin');
      expect(code).toContain("import { ok, fail } from 'xcli'");
      expect(code).toContain('ok(');
    });

    it.each(templateNames)('should include createSite() in "%s" template', (name) => {
      const code = TEMPLATES[name]('my-plugin');
      expect(code).toContain('xcli.createSite');
    });

    it.each(templateNames)(
      'should include at least one site.command() in "%s" template',
      (name) => {
        const code = TEMPLATES[name]('my-plugin');
        expect(code).toContain('site.command');
      }
    );
  });

  describe('static template', () => {
    it('should include page scope', () => {
      const code = TEMPLATES.static('test-site');
      expect(code).toContain("scope: 'page'");
    });

    it('should include zod parameters', () => {
      const code = TEMPLATES.static('test-site');
      expect(code).toContain('z.object');
    });
  });

  describe('login template', () => {
    it('should include requiresLogin', () => {
      const code = TEMPLATES.login('test-site');
      expect(code).toContain('requiresLogin: true');
    });

    it('should include login and logout handlers', () => {
      const code = TEMPLATES.login('test-site');
      expect(code).toContain('site.login');
      expect(code).toContain('site.logout');
    });

    it('should use ctx.storage for auth', () => {
      const code = TEMPLATES.login('test-site');
      expect(code).toContain('auth_token');
      expect(code).toContain("ctx.storage.get('auth_token')");
    });
  });

  describe('api template', () => {
    it('should include project scope', () => {
      const code = TEMPLATES.api('test-site');
      expect(code).toContain("scope: 'project'");
    });

    it('should include z.enum for method', () => {
      const code = TEMPLATES.api('test-site');
      expect(code).toContain('z.enum');
    });

    it('should include z.array for batch endpoints', () => {
      const code = TEMPLATES.api('test-site');
      expect(code).toContain('z.array');
    });
  });

  describe('dynamic template', () => {
    it('should include pagination parameters', () => {
      const code = TEMPLATES.dynamic('test-site');
      expect(code).toContain('page');
      expect(code).toContain('limit');
    });
  });

  describe('createCommand validation', () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.mocked(mkdirSync).mockClear();
      vi.mocked(writeFileSync).mockClear();
      vi.mocked(existsSync).mockReturnValue(false);
      exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as never);
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should exit when no name provided', async () => {
      await expect(createCommand([], {})).rejects.toThrow('process.exit');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });

    it('should exit for invalid name with uppercase', async () => {
      await expect(createCommand(['MyPlugin'], {})).rejects.toThrow('process.exit');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid plugin name'));
    });

    it('should exit for name starting with number', async () => {
      await expect(createCommand(['1plugin'], {})).rejects.toThrow('process.exit');
    });

    it('should exit for name with underscores', async () => {
      await expect(createCommand(['my_plugin'], {})).rejects.toThrow('process.exit');
    });

    it('should exit for name with spaces', async () => {
      await expect(createCommand(['my plugin'], {})).rejects.toThrow('process.exit');
    });

    it('should accept valid kebab-case name and create files', async () => {
      await createCommand(['test-valid-name'], { template: 'static', global: true });
      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should create index.ts with template code', async () => {
      await createCommand(['my-test-plugin'], { template: 'login', global: true });
      const indexCall = vi
        .mocked(writeFileSync)
        .mock.calls.find((c) => (c[0] as string).endsWith('index.ts'));
      expect(indexCall![1]).toContain("name: 'my-test-plugin'");
      expect(indexCall![1]).toContain('site.login');
    });

    it('should create package.json with name', async () => {
      await createCommand(['my-plugin'], { template: 'static', global: true });
      const pkgCall = vi
        .mocked(writeFileSync)
        .mock.calls.find((c) => (c[0] as string).endsWith('package.json'));
      const pkg = JSON.parse(pkgCall![1] as string);
      expect(pkg.name).toBe('my-plugin');
      expect(pkg.dependencies.zod).toBeDefined();
    });

    it('should exit for unknown template', async () => {
      await expect(createCommand(['my-plugin'], { template: 'unknown' })).rejects.toThrow(
        'process.exit'
      );
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown template'));
    });

    it('should exit when plugin directory already exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      await expect(createCommand(['existing-plugin'], { template: 'static' })).rejects.toThrow(
        'process.exit'
      );
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });

    it('should use static as default template', async () => {
      await createCommand(['test-default-tpl'], { global: true });
      const indexCall = vi
        .mocked(writeFileSync)
        .mock.calls.find((c) => (c[0] as string).endsWith('index.ts'));
      expect(indexCall![1]).toContain("name: 'test-default-tpl'");
      expect(indexCall![1]).toContain('scrape');
    });

    it('should create in project dir when --project flag', async () => {
      await createCommand(['proj-plugin'], { template: 'static', project: true });
      const dir = vi.mocked(mkdirSync).mock.calls[0]![0] as string;
      expect(dir).toContain('.xcli/plugins');
      expect(dir).not.toContain('/tmp/test-home');
    });

    it('should accept -g flag for global', async () => {
      await createCommand(['global-plugin'], { template: 'static', g: true });
      const dir = vi.mocked(mkdirSync).mock.calls[0]![0] as string;
      expect(dir).toContain('/tmp/test-home');
    });

    it('should accept -t as short for template', async () => {
      await createCommand(['short-tpl-plugin'], { t: 'api' });
      const indexCall = vi
        .mocked(writeFileSync)
        .mock.calls.find((c) => (c[0] as string).endsWith('index.ts'));
      expect(indexCall![1]).toContain("scope: 'project'");
    });
  });
});
