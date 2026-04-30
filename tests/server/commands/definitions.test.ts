import { describe, it } from 'node:test';
import assert from 'node:assert';
import { commands, getCommandNames } from '../../../src/commands/definitions.js';

describe('command definitions - missing commands', () => {
  it('should have select command in definitions', () => {
    assert.ok(commands['select'], 'select command should be defined in definitions');
  });

  it('should have check command in definitions', () => {
    assert.ok(commands['check'], 'check command should be defined in definitions');
  });

  it('should have waitForSelector command in definitions', () => {
    assert.ok(
      commands['waitForSelector'],
      'waitForSelector command should be defined in definitions'
    );
  });

  it('should include select in getCommandNames', () => {
    const names = getCommandNames();
    assert.ok(names.includes('select'), 'select should appear in command names');
  });

  it('should include check in getCommandNames', () => {
    const names = getCommandNames();
    assert.ok(names.includes('check'), 'check should appear in command names');
  });

  it('should include waitForSelector in getCommandNames', () => {
    const names = getCommandNames();
    assert.ok(names.includes('waitForSelector'), 'waitForSelector should appear in command names');
  });
});

describe('command definitions - select schema', () => {
  it('should parse select command with selector and value', () => {
    const schema = commands['select'].schema;
    const result = schema.safeParse({ selector: '#city', value: 'shanghai' });
    assert.ok(result.success, `select schema should parse valid args: ${result.success}`);
  });
});

describe('command definitions - check schema', () => {
  it('should parse check command with selector', () => {
    const schema = commands['check'].schema;
    const result = schema.safeParse({ selector: '#agree' });
    assert.ok(result.success, `check schema should parse valid args: ${result.success}`);
  });
});

describe('command definitions - waitForSelector schema', () => {
  it('should parse waitForSelector with just selector', () => {
    const schema = commands['waitForSelector'].schema;
    const result = schema.safeParse({ selector: '.item' });
    assert.ok(result.success, `waitForSelector schema should parse valid args`);
  });

  it('should parse waitForSelector with selector and timeout', () => {
    const schema = commands['waitForSelector'].schema;
    const result = schema.safeParse({ selector: '.item', timeout: 5000 });
    assert.ok(result.success, `waitForSelector schema should parse with timeout`);
  });
});
