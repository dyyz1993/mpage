import { describe, it, expect, vi, afterEach } from 'vitest';
import { tip } from '../../src/utils/tip.js';

describe('tip', () => {
  const calls: string[][] = [];
  let origError: typeof console.error;

  afterEach(() => {
    console.error = origError;
    calls.length = 0;
  });

  function setupSpy() {
    origError = console.error;
    calls.length = 0;
    console.error = (...args: unknown[]) => {
      calls.push(args.map(String));
    };
  }

  it('should print a single message with [提示] prefix', () => {
    setupSpy();
    tip('hello');
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toContain('[提示]');
    expect(calls[0][0]).toContain('hello');
  });

  it('should print yellow ANSI color codes', () => {
    setupSpy();
    tip('colored');
    expect(calls[0][0]).toContain('\x1b[33m');
    expect(calls[0][0]).toContain('\x1b[0m');
  });

  it('should accept an array of messages', () => {
    setupSpy();
    tip(['one', 'two', 'three']);
    expect(calls).toHaveLength(3);
    expect(calls[0][0]).toContain('one');
    expect(calls[1][0]).toContain('two');
    expect(calls[2][0]).toContain('three');
  });

  it('should handle empty array', () => {
    setupSpy();
    tip([]);
    expect(calls).toHaveLength(0);
  });

  it('should handle single-item array', () => {
    setupSpy();
    tip(['only']);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toContain('only');
  });
});
