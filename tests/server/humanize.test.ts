import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanizedPage, humanize } from '../../src/server/humanize/index.js';
import type { Page } from 'playwright';

function createMockPage(overrides?: Partial<Page>): Page {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    mouse: {
      move: vi.fn().mockResolvedValue(undefined),
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  } as unknown as Page;
}

function createMockElement(box: { x: number; y: number; width: number; height: number }) {
  return {
    boundingBox: vi.fn().mockResolvedValue(box),
  };
}

describe('humanize', () => {
  it('should return a HumanizedPage instance', () => {
    const page = createMockPage();
    const result = humanize(page);
    expect(result).toBeInstanceOf(HumanizedPage);
  });

  it('should pass custom options to HumanizedPage', async () => {
    const page = createMockPage();
    const h = humanize(page, { clickJitter: 0 });
    expect(h).toBeInstanceOf(HumanizedPage);
  });
});

describe('HumanizedPage', () => {
  it('raw should return the underlying Page', () => {
    const page = createMockPage();
    const h = new HumanizedPage(page);
    expect(h.raw).toBe(page);
  });

  describe('goto', () => {
    it('should navigate with domcontentloaded and wait', async () => {
      const page = createMockPage();
      const h = new HumanizedPage(page);
      await h.goto('https://example.com');
      expect(page.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
      });
      expect(page.waitForTimeout).toHaveBeenCalled();
    });
  });

  describe('waitForSelector', () => {
    it('should wait for visible state then pause', async () => {
      const page = createMockPage();
      const h = new HumanizedPage(page);
      await h.waitForSelector('.btn');
      expect(page.waitForSelector).toHaveBeenCalledWith('.btn', { state: 'visible' });
      expect(page.waitForTimeout).toHaveBeenCalled();
    });
  });

  describe('click', () => {
    it('should throw if element not found', async () => {
      const page = createMockPage({ $: vi.fn().mockResolvedValue(null) });
      const h = new HumanizedPage(page);
      await expect(h.click('#missing')).rejects.toThrow('Element not found: #missing');
    });

    it('should throw if element not visible', async () => {
      const el = createMockElement(
        null as unknown as { x: number; y: number; width: number; height: number }
      );
      el.boundingBox.mockResolvedValue(null);
      const page = createMockPage({
        $: vi.fn().mockResolvedValue(el),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
      });
      const h = new HumanizedPage(page);
      await expect(h.click('#hidden')).rejects.toThrow('Element not visible: #hidden');
    });

    it('should move mouse and click within bounding box', async () => {
      const box = { x: 100, y: 100, width: 200, height: 50 };
      const el = createMockElement(box);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await h.click('#btn');

      expect(page.mouse.down).toHaveBeenCalled();
      expect(page.mouse.up).toHaveBeenCalled();
      expect(page.mouse.move).toHaveBeenCalled();
    });

    it('should retry waitForSelector if boundingBox is null on first try', async () => {
      const box = { x: 50, y: 50, width: 100, height: 30 };
      const el = { boundingBox: vi.fn() };
      el.boundingBox.mockResolvedValueOnce(null).mockResolvedValueOnce(box);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await h.click('#delayed');

      expect(page.waitForSelector).toHaveBeenCalledWith('#delayed', {
        state: 'visible',
        timeout: 3000,
      });
      expect(page.mouse.down).toHaveBeenCalled();
    });
  });

  describe('fill', () => {
    it('should click then fill the input', async () => {
      const box = { x: 10, y: 10, width: 200, height: 30 };
      const el = createMockElement(box);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await h.fill('#input', 'hello');

      expect(page.fill).toHaveBeenCalledWith('#input', 'hello');
    });

    it('should fallback to page.click if humanized click fails', async () => {
      const page = createMockPage({ $: vi.fn().mockResolvedValue(null) });
      const h = new HumanizedPage(page);
      await h.fill('#input', 'fallback');

      expect(page.click).toHaveBeenCalledWith('#input');
      expect(page.fill).toHaveBeenCalledWith('#input', 'fallback');
    });
  });

  describe('type', () => {
    it('should delegate to fill', async () => {
      const box = { x: 10, y: 10, width: 200, height: 30 };
      const el = createMockElement(box);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await h.type('#input', 'typed');

      expect(page.fill).toHaveBeenCalledWith('#input', 'typed');
    });
  });

  describe('hover', () => {
    it('should throw if element not found', async () => {
      const page = createMockPage({ $: vi.fn().mockResolvedValue(null) });
      const h = new HumanizedPage(page);
      await expect(h.hover('#gone')).rejects.toThrow('Element not found: #gone');
    });

    it('should throw if element not visible', async () => {
      const el = createMockElement(
        null as unknown as { x: number; y: number; width: number; height: number }
      );
      el.boundingBox.mockResolvedValue(null);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await expect(h.hover('#invisible')).rejects.toThrow('Element not visible: #invisible');
    });

    it('should move mouse to element center with jitter', async () => {
      const box = { x: 200, y: 150, width: 100, height: 40 };
      const el = createMockElement(box);
      const page = createMockPage({ $: vi.fn().mockResolvedValue(el) });
      const h = new HumanizedPage(page);
      await h.hover('#target');

      expect(page.mouse.move).toHaveBeenCalled();
      const moves = (page.mouse.move as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(moves).toBeGreaterThan(0);
    });
  });
});
