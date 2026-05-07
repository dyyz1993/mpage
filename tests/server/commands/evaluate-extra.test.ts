import { describe, it, expect, vi } from 'vitest';
import { evaluateCommands } from '../../../src/server/commands/evaluate.js';
import type { Page, Frame } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  return {
    evaluate: vi.fn(() => Promise.resolve('result')),
    waitForTimeout: vi.fn(() => Promise.resolve()),
    waitForLoadState: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as Page;
}

function createMockFrame(overrides: Record<string, unknown> = {}): Frame {
  return {
    evaluate: vi.fn(() => Promise.resolve('frame-result')),
    ...overrides,
  } as unknown as Frame;
}

describe('evaluateCommands - evaluateRaw', () => {
  it('should wrap script in async IIFE and return result', async () => {
    const mockPage = createMockPage({ evaluate: vi.fn(() => Promise.resolve(42)) });
    const result = await evaluateCommands.evaluateRaw(mockPage, { script: '1 + 41' });
    expect(result).toStrictEqual({ result: 42 });
    const evalCalls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(evalCalls[0][0]).toContain('async');
    expect(evalCalls[0][0]).toContain('1 + 41');
  });
});

describe('evaluateCommands - wait', () => {
  it('should call waitForLoadState when state is provided', async () => {
    const mockPage = createMockPage();
    const result = await evaluateCommands.wait(mockPage, { state: 'networkidle' });
    expect(result).toStrictEqual({ state: 'networkidle' });
    expect((mockPage.waitForLoadState as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((mockPage.waitForLoadState as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'networkidle'
    );
  });

  it('should use default timeout 1000 when no timeout and no state', async () => {
    const mockPage = createMockPage();
    const result = await evaluateCommands.wait(mockPage, {});
    expect(result).toStrictEqual({ waited: 1000 });
    expect((mockPage.waitForTimeout as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((mockPage.waitForTimeout as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(1000);
  });

  it('should use custom timeout when provided', async () => {
    const mockPage = createMockPage();
    const result = await evaluateCommands.wait(mockPage, { timeout: 5000 });
    expect(result).toStrictEqual({ waited: 5000 });
    expect((mockPage.waitForTimeout as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(5000);
  });

  it('should fall back to setTimeout for Frame context without waitForTimeout', async () => {
    vi.useFakeTimers();
    const mockFrame = createMockFrame();
    const resultPromise = evaluateCommands.wait(mockFrame, { timeout: 100 });
    vi.advanceTimersByTime(150);
    const result = await resultPromise;
    expect(result).toStrictEqual({ waited: 100 });
    vi.useRealTimers();
  });

  it('should handle domcontentloaded state', async () => {
    const mockPage = createMockPage();
    const result = await evaluateCommands.wait(mockPage, { state: 'domcontentloaded' });
    expect(result).toStrictEqual({ state: 'domcontentloaded' });
  });
});
