import { describe, it, expect, vi } from 'vitest';
import { RecorderController } from '../../../src/server/recorder/controller.js';
import type { Page, BrowserContext } from 'playwright-core';

function createMockPage(): Page {
  const mockContext: BrowserContext = {
    pages: vi.fn(() => []),
    addInitScript: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    off: vi.fn(),
    browser: vi.fn(() => null),
  } as unknown as BrowserContext;

  const page = {
    context: vi.fn(() => mockContext),
    url: vi.fn(() => 'about:blank'),
    title: vi.fn(() => Promise.resolve('Test')),
    addScriptTag: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as Page;

  mockContext.pages = vi.fn(() => [page]);

  return page;
}

describe('RecorderController - getStatus', () => {
  it('should return null when not recording', () => {
    const page = createMockPage();
    const controller = new RecorderController(page);
    expect(controller.getStatus()).toBeNull();
  });

  it('should return status object when recording', () => {
    const page = createMockPage();
    const controller = new RecorderController(page);
    (controller as unknown as { isRecordingFlag: boolean }).isRecordingFlag = true;
    (controller as unknown as { startTime: number }).startTime = Date.now() - 5000;
    (controller as unknown as { events: unknown[] }).events = [{ type: 'click' }, { type: 'fill' }];

    const status = controller.getStatus();
    expect(status).not.toBeNull();
    expect(status!.isRecording).toBe(true);
    expect(status!.eventCount).toBe(2);
    expect(status!.duration).toBeGreaterThanOrEqual(5000);
  });
});

describe('RecorderController - start guard', () => {
  it('should throw if already recording', async () => {
    const page = createMockPage();
    const controller = new RecorderController(page);
    (controller as unknown as { isRecordingFlag: boolean }).isRecordingFlag = true;

    await expect(controller.start({})).rejects.toThrow('Recording is already in progress');
  });
});

describe('RecorderController - stop guard', () => {
  it('should throw if not recording', async () => {
    const page = createMockPage();
    const controller = new RecorderController(page);

    await expect(controller.stop()).rejects.toThrow('No recording in progress');
  });
});

describe('RecorderController - id', () => {
  it('should return a recording id string', () => {
    const page = createMockPage();
    const controller = new RecorderController(page);
    expect(typeof controller.id).toBe('string');
    expect(controller.id.length).toBeGreaterThan(0);
  });

  it('should return unique ids for different controllers', () => {
    const page1 = createMockPage();
    const page2 = createMockPage();
    const controller1 = new RecorderController(page1);
    const controller2 = new RecorderController(page2);
    expect(controller1.id).not.toBe(controller2.id);
  });
});
