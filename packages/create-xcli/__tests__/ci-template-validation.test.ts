import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createEngine } from '../src/generator.js';
import { ScaffoldEngine } from '@dyyz1993/xcli-core';
import fs from 'fs/promises';
import path from 'path';
import type { PromptResult } from '../src/prompts.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SUCCESS_DIR = path.join(FIXTURES_DIR, 'expected-success');
const FAIL_DIR = path.join(FIXTURES_DIR, 'expected-fail');
const TMP_DIR = path.join(process.cwd(), '.tmp-ci-template-validation');

interface SuccessFixture {
  template: string;
  projectName: string;
  expectedFiles: string[];
  expectedVariables: Record<string, string>;
}

interface FailFixture {
  template: string;
  projectName: string;
  variables: Record<string, string>;
  expectedError: string;
}

async function loadSuccessFixture(name: string): Promise<SuccessFixture> {
  const raw = await fs.readFile(path.join(SUCCESS_DIR, name), 'utf-8');
  return JSON.parse(raw) as SuccessFixture;
}

async function loadFailFixture(name: string): Promise<FailFixture> {
  const raw = await fs.readFile(path.join(FAIL_DIR, name), 'utf-8');
  return JSON.parse(raw) as FailFixture;
}

describe('CI template validation', () => {
  let engine: ScaffoldEngine;

  beforeAll(async () => {
    engine = createEngine();
    await fs.mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe('SUCCESS case: all templates generate correct files', () => {
    const successFixtures = [
      'base-structure.json',
      'minimal-plugin-structure.json',
      'browser-structure.json',
      'database-structure.json',
      'api-structure.json',
    ];

    successFixtures.forEach((fixtureFile) => {
      describe(`fixture: ${fixtureFile}`, () => {
        let fixture: SuccessFixture;
        let projectDir: string;

        beforeAll(async () => {
          fixture = await loadSuccessFixture(fixtureFile);
          projectDir = path.join(TMP_DIR, fixture.projectName);
        });

        it(`should generate all expected files for ${fixtureFile.replace('.json', '')}`, async () => {
          const result = await engine.generate(fixture.template, fixture.projectName, {
            targetDir: projectDir,
            variables: fixture.expectedVariables,
          });

          expect(result.files.length).toBeGreaterThan(0);

          for (const expectedFile of fixture.expectedFiles) {
            const fullPath = path.join(projectDir, expectedFile);
            const exists = await fs
              .access(fullPath)
              .then(() => true)
              .catch(() => false);
            expect(exists, `Missing expected file: ${expectedFile}`).toBe(true);
          }
        });

        it(`should have correct file count for ${fixtureFile.replace('.json', '')}`, async () => {
          const result = await engine.generate(fixture.template, `${fixture.projectName}-count`, {
            targetDir: path.join(TMP_DIR, `${fixture.projectName}-count`),
            variables: fixture.expectedVariables,
            force: true,
          });

          expect(result.files.length).toBe(fixture.expectedFiles.length);
        });

        it(`should interpolate projectName in generated files for ${fixtureFile.replace('.json', '')}`, async () => {
          const pkgPath = path.join(projectDir, 'package.json');
          const exists = await fs
            .access(pkgPath)
            .then(() => true)
            .catch(() => false);

          if (exists) {
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
            expect(pkg.name).toBe(fixture.projectName);
          }
        });

        it(`should not contain unresolved template variables for ${fixtureFile.replace('.json', '')}`, async () => {
          const result = await engine.generate(
            fixture.template,
            `${fixture.projectName}-unresolved`,
            {
              targetDir: path.join(TMP_DIR, `${fixture.projectName}-unresolved`),
              variables: fixture.expectedVariables,
              force: true,
            }
          );

          for (const filePath of result.files) {
            const fullPath = path.join(
              path.join(TMP_DIR, `${fixture.projectName}-unresolved`),
              filePath
            );
            const content = await fs.readFile(fullPath, 'utf-8');
            const unresolved = content.match(/\{\{(\w+)\}\}/g);
            expect(
              unresolved,
              `Unresolved template variables in ${filePath}: ${unresolved?.join(', ')}`
            ).toBeNull();
          }
        });
      });
    });
  });

  describe('FAIL case: invalid template name', () => {
    it('should throw error for non-existent template', async () => {
      const fixture = await loadFailFixture('invalid-template.json');

      await expect(
        engine.generate(fixture.template, fixture.projectName, {
          targetDir: path.join(TMP_DIR, 'fail-invalid-template'),
          variables: fixture.variables,
        })
      ).rejects.toThrow(fixture.expectedError);
    });
  });

  describe('FAIL case: empty project name', () => {
    it('should create project at cwd when project name is empty without targetDir', async () => {
      const fixture = await loadFailFixture('invalid-project-name.json');

      const result = await engine.generate(fixture.template, fixture.projectName, {
        targetDir: path.join(TMP_DIR, 'fail-empty-name'),
        variables: fixture.variables,
      });

      expect(result.projectDir).toBe(path.join(TMP_DIR, 'fail-empty-name'));

      const pkgPath = path.join(result.projectDir, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      expect(pkg.name).toBe('');
    });
  });

  describe('FAIL case: missing required variable', () => {
    it('should throw error when required variable with no default is omitted', async () => {
      const fixture = await loadFailFixture('missing-required-var.json');

      const template = engine.getTemplate(fixture.template);
      expect(template).toBeDefined();

      if (template) {
        const templateWithRequired = {
          ...template,
          variables: [{ name: 'description', description: 'Project description', required: true }],
        };

        const testEngine = new ScaffoldEngine();
        testEngine.registerTemplate(templateWithRequired);

        await expect(
          testEngine.generate(fixture.template, fixture.projectName, {
            targetDir: path.join(TMP_DIR, 'fail-missing-var'),
            variables: {},
          })
        ).rejects.toThrow(fixture.expectedError);
      }
    });
  });

  describe('FAIL case: variable validation failure', () => {
    it('should throw error when dbType validation fails', async () => {
      const template = engine.getTemplate('database');
      expect(template).toBeDefined();

      if (template) {
        await expect(
          engine.generate('database', 'test-bad-db', {
            targetDir: path.join(TMP_DIR, 'fail-bad-dbtype'),
            variables: { dbType: 'oracle' },
          })
        ).rejects.toThrow('Must be one of');
      }
    });
  });
});
