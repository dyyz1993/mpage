import { describe, it, expect } from 'vitest';
import { commands, getCommandNames } from '../../../src/commands/definitions.js';

describe('command definitions - missing commands', () => {
  it('should have select command in definitions', () => {
    expect(commands['select']).toBeTruthy();
  });

  it('should have check command in definitions', () => {
    expect(commands['check']).toBeTruthy();
  });

  it('should have waitForSelector command in definitions', () => {
    expect(commands['waitForSelector']).toBeTruthy();
  });

  it('should include select in getCommandNames', () => {
    const names = getCommandNames();
    expect(names.includes('select')).toBeTruthy();
  });

  it('should include check in getCommandNames', () => {
    const names = getCommandNames();
    expect(names.includes('check')).toBeTruthy();
  });

  it('should include waitForSelector in getCommandNames', () => {
    const names = getCommandNames();
    expect(names.includes('waitForSelector')).toBeTruthy();
  });
});

describe('command definitions - select schema', () => {
  it('should parse select command with selector and value', () => {
    const schema = commands['select'].schema;
    const result = schema.safeParse({ selector: '#city', value: 'shanghai' });
    expect(result.success).toBeTruthy();
  });
});

describe('command definitions - check schema', () => {
  it('should parse check command with selector', () => {
    const schema = commands['check'].schema;
    const result = schema.safeParse({ selector: '#agree' });
    expect(result.success).toBeTruthy();
  });
});

describe('command definitions - waitForSelector schema', () => {
  it('should parse waitForSelector with just selector', () => {
    const schema = commands['waitForSelector'].schema;
    const result = schema.safeParse({ selector: '.item' });
    expect(result.success).toBeTruthy();
  });

  it('should parse waitForSelector with selector and timeout', () => {
    const schema = commands['waitForSelector'].schema;
    const result = schema.safeParse({ selector: '.item', timeout: 5000 });
    expect(result.success).toBeTruthy();
  });
});
