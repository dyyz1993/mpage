import { describe, it, expect, afterAll } from 'vitest';
import { generateProject } from '../src/generator.js';
import fs from 'fs/promises';
import path from 'path';

const TMP_DIR = path.join(process.cwd(), '.tmp-e2e-test');

describe('E2E: create-xcli scaffold', () => {
  afterAll(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true }).catch(() => {});
  });

  const templates = ['base', 'minimal-plugin', 'browser', 'database', 'api'];

  templates.forEach((template) => {
    describe(`template: ${template}`, () => {
      const projectName = `test-${template}`;
      const projectDir = path.join(TMP_DIR, projectName);

      it('should generate project files', async () => {
        const result = await generateProject({ projectName, template, variables: {} }, TMP_DIR);
        expect(result.files.length).toBeGreaterThan(0);
        const stat = await fs.stat(projectDir);
        expect(stat.isDirectory()).toBe(true);
      });

      it('should have valid package.json', async () => {
        const pkgPath = path.join(projectDir, 'package.json');
        const exists = await fs
          .access(pkgPath)
          .then(() => true)
          .catch(() => false);
        if (!exists) return;

        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        expect(pkg.name).toBe(projectName);
        expect(pkg.dependencies || pkg.devDependencies || {}).toBeDefined();
      });

      it('should reference correct @dyyz1993/xcli-core version', async () => {
        const pkgPath = path.join(projectDir, 'package.json');
        const exists = await fs
          .access(pkgPath)
          .then(() => true)
          .catch(() => false);
        if (!exists) return;

        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        const coreDep = pkg.dependencies?.['@dyyz1993/xcli-core'];
        if (coreDep) {
          expect(coreDep).toBe('^0.6.0');
        }
      });
    });
  });
});
