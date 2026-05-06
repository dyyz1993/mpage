import { describe, it, expect, afterAll } from 'vitest';
import { generateProject } from '../src/generator.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const TMP = path.join(process.cwd(), '.tmp-ci-e2e');

const runFullE2E = process.env.CI === 'true' || process.env.RUN_E2E === 'true';

describe.skipIf(!runFullE2E)('CI E2E: full scaffold → build → run', () => {
  afterAll(async () => {
    await fs.rm(TMP, { recursive: true, force: true }).catch(() => {});
  });

  describe('base template full flow', () => {
    const projectDir = path.join(TMP, 'my-cli');

    it('step 1: generate project', async () => {
      const result = await generateProject(
        { projectName: 'my-cli', template: 'base', variables: {} },
        TMP
      );
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('step 2: npm install', () => {
      execSync('npm install', { cwd: projectDir, stdio: 'pipe', timeout: 120_000 });
    });

    it('step 3: build', () => {
      execSync('npm run build', { cwd: projectDir, stdio: 'pipe', timeout: 60_000 });
    });

    it('step 4: verify generated structure', async () => {
      const files = await fs.readdir(projectDir);
      expect(files).toContain('package.json');
      expect(files).toContain('tsconfig.json');
      expect(files).toContain('src');
    });
  });

  describe('minimal-plugin template', () => {
    const projectDir = path.join(TMP, 'my-plugin');

    it('step 1: generate plugin', async () => {
      const result = await generateProject(
        {
          projectName: 'my-plugin',
          template: 'minimal-plugin',
          variables: { siteUrl: 'https://example.com' },
        },
        TMP
      );
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('step 2: verify plugin structure', async () => {
      const files = await fs.readdir(projectDir);
      expect(files).toContain('index.ts');
      expect(files).toContain('package.json');

      const indexContent = await fs.readFile(path.join(projectDir, 'index.ts'), 'utf-8');
      expect(indexContent).toContain('createSite');
      expect(indexContent).toContain('hello');
    });
  });
});
