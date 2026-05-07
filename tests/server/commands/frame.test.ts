import { describe, it, expect, vi } from 'vitest';
import { frameCommands } from '../../../src/server/commands/frame.js';
import type { Page, Frame } from 'playwright-core';

function createMockFrame(name: string, url: string): Frame {
  return { name: () => name, url: () => url } as unknown as Frame;
}

function createMockPage(frames: Frame[] = [], mainFrame?: Frame): Page {
  return {
    frames: vi.fn(() => frames),
    mainFrame: vi.fn(() => mainFrame || frames[0]),
  } as unknown as Page;
}

describe('frameCommands - frames', () => {
  it('should list all frames', async () => {
    const f0 = createMockFrame('', 'https://example.com');
    const f1 = createMockFrame('iframe-1', 'https://cdn.example.com/widget');
    const mockPage = createMockPage([f0, f1], f0);

    const result = await frameCommands.frames(mockPage, {});

    expect(result.count).toBe(2);
    expect(result.frames[0]).toStrictEqual({
      index: 0,
      name: '',
      url: 'https://example.com',
      isMain: true,
    });
    expect(result.frames[1]).toStrictEqual({
      index: 1,
      name: 'iframe-1',
      url: 'https://cdn.example.com/widget',
      isMain: false,
    });
  });

  it('should return empty array when no frames', async () => {
    const mockPage = createMockPage([]);
    const result = await frameCommands.frames(mockPage, {});
    expect(result.count).toBe(0);
    expect(result.frames).toStrictEqual([]);
  });
});

describe('frameCommands - frame', () => {
  it('should find frame by index', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const f1 = createMockFrame('embed', 'https://other.com');
    const mockPage = createMockPage([f0, f1]);

    const result = await frameCommands.frame(mockPage, { index: 1 });

    expect(result).toStrictEqual({
      action: 'switch',
      name: 'embed',
      url: 'https://other.com',
      index: 1,
    });
  });

  it('should return error when index out of bounds', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const mockPage = createMockPage([f0]);

    const result = await frameCommands.frame(mockPage, { index: 5 });

    expect(result).toStrictEqual({ error: 'Frame not found', available: 1 });
  });

  it('should find frame by name', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const f1 = createMockFrame('widget', 'https://widget.com');
    const mockPage = createMockPage([f0, f1]);

    const result = await frameCommands.frame(mockPage, { name: 'widget' });

    expect(result).toStrictEqual({
      action: 'switch',
      name: 'widget',
      url: 'https://widget.com',
      index: 1,
    });
  });

  it('should return error when name not found', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const mockPage = createMockPage([f0]);

    const result = await frameCommands.frame(mockPage, { name: 'nonexistent' });

    expect(result).toStrictEqual({ error: 'Frame not found', available: 1 });
  });

  it('should find frame by url pattern', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const f1 = createMockFrame('', 'https://cdn.example.com/embed');
    const mockPage = createMockPage([f0, f1]);

    const result = await frameCommands.frame(mockPage, { url: 'cdn.example' });

    expect(result).toStrictEqual({
      action: 'switch',
      name: '',
      url: 'https://cdn.example.com/embed',
      index: 1,
    });
  });

  it('should return reset action when reset flag', async () => {
    const mockPage = createMockPage([]);
    const result = await frameCommands.frame(mockPage, { reset: true });
    expect(result).toStrictEqual({ action: 'reset', message: 'Switched back to main frame' });
  });

  it('should return error when no args match any frame', async () => {
    const f0 = createMockFrame('main', 'https://example.com');
    const mockPage = createMockPage([f0]);
    const result = await frameCommands.frame(mockPage, { url: 'notfound.com' });
    expect(result).toStrictEqual({ error: 'Frame not found', available: 1 });
  });
});
