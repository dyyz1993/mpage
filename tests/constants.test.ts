import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';

describe('constants', () => {
  it('DEFAULT_CHROMIUM_PATH should fallback to macOS default', async () => {
    const { DEFAULT_CHROMIUM_PATH } = await import('../src/constants.js');
    assert.strictEqual(DEFAULT_CHROMIUM_PATH, '/Applications/Chromium.app/Contents/MacOS/Chromium');
  });

  it('DEFAULT_STORAGE should end with mpage', async () => {
    const { DEFAULT_STORAGE } = await import('../src/constants.js');
    assert.ok(DEFAULT_STORAGE.endsWith('mpage'));
    assert.ok(typeof DEFAULT_STORAGE === 'string');
  });

  it('DEFAULT_CHROMIUM_PATH should respect MPAGE_CHROMIUM_PATH env var', () => {
    const result = execSync(
      'npx tsx -e "import(\'./src/constants.js\').then(m => console.log(m.DEFAULT_CHROMIUM_PATH))"',
      { env: { ...process.env, MPAGE_CHROMIUM_PATH: '/custom/chromium' }, cwd: process.cwd() }
    )
      .toString()
      .trim();
    assert.strictEqual(result, '/custom/chromium');
  });

  it('DEFAULT_STORAGE should respect MPAGE_STORAGE_DIR env var', () => {
    const result = execSync(
      'npx tsx -e "import(\'./src/constants.js\').then(m => console.log(m.DEFAULT_STORAGE))"',
      { env: { ...process.env, MPAGE_STORAGE_DIR: '/custom/storage' }, cwd: process.cwd() }
    )
      .toString()
      .trim();
    assert.strictEqual(result, '/custom/storage/mpage');
  });
});
