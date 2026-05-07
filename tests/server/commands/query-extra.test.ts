import { describe, it, expect, vi } from 'vitest';
import { queryCommands } from '../../../src/server/commands/query.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  return {
    evaluate: vi.fn((fn: unknown, ...args: unknown[]) => {
      if (typeof fn === 'function') return Promise.resolve(fn(...args));
      return Promise.resolve(undefined);
    }),
    innerHTML: vi.fn(() => Promise.resolve('<div>hello</div>')),
    content: vi.fn(() => Promise.resolve('<html><body>page</body></html>')),
    textContent: vi.fn(() => Promise.resolve('body text')),
    locator: vi.fn(
      () =>
        ({
          inputValue: vi.fn(() => Promise.resolve('input-val')),
          textContent: vi.fn(() => Promise.resolve('locator-text')),
        }) as unknown as Locator
    ),
    getAttribute: vi.fn(() => Promise.resolve('attr-value')),
    addScriptTag: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as Page;
}

describe('queryCommands - query', () => {
  it('should query elements by selector', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve([
        { index: 0, tagName: 'DIV', id: 'main', className: 'container', text: 'Hello', href: '' },
      ])
    );
    const result = await queryCommands.query(mockPage, { selector: 'div' });
    expect(result.count).toBe(1);
    expect(result.elements[0].tagName).toBe('DIV');
  });

  it('should return empty array when no matches', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve([]));
    const result = await queryCommands.query(mockPage, { selector: '.nonexistent' });
    expect(result.count).toBe(0);
  });

  it('should pass selector to evaluate', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve([]));
    await queryCommands.query(mockPage, { selector: 'a.link' });
    const calls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1]).toBe('a.link');
  });
});

describe('queryCommands - find', () => {
  it('should find elements by text', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve([
        {
          index: 0,
          tagName: 'BUTTON',
          id: '',
          className: 'btn',
          text: 'Submit',
          href: '',
          selector: '.btn',
        },
      ])
    );
    const result = await queryCommands.find(mockPage, { text: 'Submit' });
    expect(result.count).toBe(1);
  });

  it('should pass exact flag', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve([]));
    await queryCommands.find(mockPage, { text: 'Test', exact: true });
    const calls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1]).toStrictEqual({ text: 'Test', tag: '*', exact: true });
  });

  it('should use custom tag filter', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve([]));
    await queryCommands.find(mockPage, { text: 'Link', tag: 'a' });
    const calls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1].tag).toBe('a');
  });

  it('should default tag to *', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve([]));
    await queryCommands.find(mockPage, { text: 'anything' });
    const calls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1].tag).toBe('*');
  });
});

describe('queryCommands - html', () => {
  it('should get element inner HTML', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.html(mockPage, { selector: '#content' });
    expect(result.html).toBe('<div>hello</div>');
  });

  it('should get full page content when no selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.html(mockPage, {});
    expect(result.html).toBe('<html><body>page</body></html>');
  });

  it('should clean HTML when clean flag is set', async () => {
    const mockPage = createMockPage();
    mockPage.content = vi.fn(() =>
      Promise.resolve(
        '<div data-v-abc123="" class="">  <span></span>  <!-- comment -->  <script>var x=1;</script>  <style>.a{}</style>  </div>'
      )
    );
    const result = await queryCommands.html(mockPage, { clean: true });
    expect(result.html).not.toContain('data-v-');
    expect(result.html).not.toContain('<!--');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('<style');
    expect(result.html).not.toContain('<span></span>');
  });

  it('should remove empty divs and spans when cleaning', async () => {
    const mockPage = createMockPage();
    mockPage.content = vi.fn(() => Promise.resolve('<div  ></div><span  ></span><p>keep</p>'));
    const result = await queryCommands.html(mockPage, { clean: true });
    expect(result.html).not.toContain('<div');
    expect(result.html).not.toContain('<span');
    expect(result.html).toContain('<p>keep</p>');
  });
});

describe('queryCommands - text', () => {
  it('should get text content of selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.text(mockPage, { selector: '#content' });
    expect(result.text).toBe('body text');
  });

  it('should default to body selector', async () => {
    const mockPage = createMockPage();
    await queryCommands.text(mockPage, {});
    const calls = (mockPage.textContent as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('body');
  });
});

describe('queryCommands - inputValue', () => {
  it('should get input value', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.inputValue(mockPage, { selector: '#email' });
    expect(result.value).toBe('input-val');
  });
});

describe('queryCommands - textContent', () => {
  it('should get text content via locator', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.textContent(mockPage, { selector: '#desc' });
    expect(result.text).toBe('locator-text');
  });
});

describe('queryCommands - getAttribute', () => {
  it('should get attribute value', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.getAttribute(mockPage, { selector: '#link', name: 'href' });
    expect(result.value).toBe('attr-value');
    const calls = (mockPage.getAttribute as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('#link');
    expect(calls[0][1]).toBe('href');
  });
});

describe('queryCommands - structure', () => {
  it('should return structure and yaml', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({
        layout: { tag: 'div', children: [] },
        yaml: '- div',
      })
    );
    const result = await queryCommands.structure(mockPage, { selector: '#app' });
    expect(result.structure).toStrictEqual({ tag: 'div', children: [] });
    expect(result.yaml).toBe('- div');
  });

  it('should add script tag before evaluating', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve({ layout: null, yaml: '' }));
    await queryCommands.structure(mockPage, { selector: 'body' });
    expect((mockPage.addScriptTag as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should default selector to body', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve({ layout: null, yaml: '' }));
    await queryCommands.structure(mockPage, {});
    const evalCalls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(evalCalls[0][1]).toBe('body');
  });

  it('should handle extractor not loaded', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({ layout: null, yaml: 'Extractor not loaded' })
    );
    const result = await queryCommands.structure(mockPage, {});
    expect(result.yaml).toBe('Extractor not loaded');
  });
});
