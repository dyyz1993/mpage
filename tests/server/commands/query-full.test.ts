import { describe, it, expect, vi, beforeAll } from 'vitest';
import { queryCommands } from '../../../src/server/commands/query.js';
import type { Page, Locator } from 'playwright-core';
import { JSDOM } from 'jsdom';

let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM(
    '<!DOCTYPE html><html><head><title>Test</title></head><body>' +
      '<div id="main" class="container">' +
      '<button id="btn" class="btn primary">Submit</button>' +
      '<a href="/home" class="nav-link">Home</a>' +
      '<input id="search" class="input-field" placeholder="Search..." value="test query" />' +
      '<p class="text">Hello World</p>' +
      '<span class="highlight">Exact Match</span>' +
      '<div class="nested"><span class="inner">Nested Text</span></div>' +
      '</div>' +
      '</body></html>',
    { url: 'https://example.com', pretendToBeVisual: true }
  );
});

function createMockPage(overrides: Record<string, unknown> = {}, customDom?: JSDOM): Page {
  const targetDom = customDom || dom;

  return {
    evaluate: vi.fn((fn: unknown, ...args: unknown[]) => {
      if (typeof fn === 'function') {
        const win = targetDom.window as unknown as Record<string, unknown>;
        const origDoc = globalThis.document;
        const origWin = globalThis.window;
        (globalThis as Record<string, unknown>).document = win.document;
        (globalThis as Record<string, unknown>).window = win;
        try {
          return Promise.resolve(fn(...args));
        } finally {
          (globalThis as Record<string, unknown>).document = origDoc;
          (globalThis as Record<string, unknown>).window = origWin;
        }
      }
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

describe('queryCommands - query with real DOM', () => {
  it('queries all buttons', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.query(mockPage, { selector: 'button' });
    expect(result.count).toBe(1);
    expect(result.elements[0].tagName).toBe('BUTTON');
    expect(result.elements[0].id).toBe('btn');
  });

  it('queries all anchors with href', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.query(mockPage, { selector: 'a' });
    expect(result.count).toBe(1);
    expect(result.elements[0].href).toBe('https://example.com/home');
  });

  it('returns empty for nonexistent selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.query(mockPage, { selector: '.nonexistent' });
    expect(result.count).toBe(0);
  });

  it('slices to 20 max elements', async () => {
    const bigDom = new JSDOM(
      Array.from({ length: 30 }, (_, i) => `<div class="item">Item ${i}</div>`).join('')
    );
    const mockPage = createMockPage({}, bigDom);
    const result = await queryCommands.query(mockPage, { selector: '.item' });
    expect(result.count).toBe(20);
  });

  it('includes className and text content', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.query(mockPage, { selector: '#btn' });
    expect(result.elements[0].className).toContain('btn');
    expect(result.elements[0].text).toContain('Submit');
  });
});

describe('queryCommands - find with real DOM', () => {
  it('finds elements by partial text match', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Submit' });
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.elements.some((el: { text: string }) => el.text.includes('Submit'))).toBe(true);
  });

  it('finds with exact=true matches exactly', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Exact Match', exact: true });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('exact=true does not match partial', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Exact', exact: true });
    expect(result.count).toBe(0);
  });

  it('finds by aria-label attribute', async () => {
    const ariaDom = new JSDOM('<button aria-label="Close dialog">X</button>');
    const mockPage = createMockPage({}, ariaDom);
    const result = await queryCommands.find(mockPage, { text: 'Close dialog' });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('finds by title attribute', async () => {
    const titleDom = new JSDOM('<span title="Tooltip text">hover me</span>');
    const mockPage = createMockPage({}, titleDom);
    const result = await queryCommands.find(mockPage, { text: 'Tooltip text' });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('finds by alt attribute', async () => {
    const altDom = new JSDOM('<img alt="Product image" src="/img.png" />');
    const mockPage = createMockPage({}, altDom);
    const result = await queryCommands.find(mockPage, { text: 'Product image' });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('finds by placeholder attribute', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Search...' });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('uses custom tag filter', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Submit', tag: 'button' });
    expect(result.count).toBe(1);
  });

  it('defaults tag to *', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Submit' });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('filters out nested elements (contains check)', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Nested Text' });
    expect(result.count).toBe(1);
  });

  it('generates #id selector when element has id', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Submit' });
    expect(result.elements[0].selector).toBe('#btn');
  });

  it('generates .class selector when element has class but no id', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.find(mockPage, { text: 'Hello World' });
    expect(result.elements[0].selector).toBe('.text');
  });

  it('generates tag selector when no id or class', async () => {
    const plainDom = new JSDOM('<p>plain text</p>');
    const mockPage = createMockPage({}, plainDom);
    const result = await queryCommands.find(mockPage, { text: 'plain text' });
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.elements[0].selector).toBe('p');
  });

  it('skips SCRIPT/STYLE/NOSCRIPT/META/LINK/HEAD/HTML/TITLE tags', async () => {
    const skipDom = new JSDOM(
      '<script>var x=1;</script><style>.a{}</style><title>Title</title><p>visible</p>'
    );
    const mockPage = createMockPage({}, skipDom);
    const result = await queryCommands.find(mockPage, { text: 'visible' });
    expect(result.count).toBeGreaterThanOrEqual(1);
    const tags = result.elements.map((el: { tagName: string }) => el.tagName);
    expect(tags).not.toContain('SCRIPT');
    expect(tags).not.toContain('STYLE');
  });

  it('limits results to 20', async () => {
    const manyDom = new JSDOM(
      Array.from({ length: 30 }, (_, i) => `<span class="item">item ${i}</span>`).join('')
    );
    const mockPage = createMockPage({}, manyDom);
    const result = await queryCommands.find(mockPage, { text: 'item' });
    expect(result.count).toBe(20);
  });
});

describe('queryCommands - html', () => {
  it('gets inner HTML for selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.html(mockPage, { selector: '#content' });
    expect(result.html).toBe('<div>hello</div>');
  });

  it('gets full page content when no selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.html(mockPage, {});
    expect(result.html).toBe('<html><body>page</body></html>');
  });

  it('clean: removes data-v- attributes with values', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() =>
      Promise.resolve('<div data-v-abc123="some-value" class="foo">content</div>')
    );
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('data-v-abc123');
  });

  it('clean: removes data-v- attributes without values', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() => Promise.resolve('<div data-v-abc123>content</div>'));
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('data-v-abc123');
  });

  it('clean: removes HTML comments', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() => Promise.resolve('<div><!-- comment -->content</div>'));
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('<!--');
  });

  it('clean: removes script tags', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() =>
      Promise.resolve('<div><script>var x = 1;</script>content</div>')
    );
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('<script');
  });

  it('clean: removes style tags', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() => Promise.resolve('<div><style>.foo{}</style>content</div>'));
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('<style');
  });

  it('clean: removes noscript tags', async () => {
    const mockPage = createMockPage();
    mockPage.innerHTML = vi.fn(() => Promise.resolve('<div><noscript>fb</noscript>content</div>'));
    const result = await queryCommands.html(mockPage, { selector: 'div', clean: true });
    expect(result.html).not.toContain('<noscript');
  });

  it('clean: removes empty div/span elements', async () => {
    const mockPage = createMockPage();
    mockPage.content = vi.fn(() => Promise.resolve('<div ></div><span ></span><p>keep</p>'));
    const result = await queryCommands.html(mockPage, { clean: true });
    expect(result.html).not.toContain('<div');
    expect(result.html).not.toContain('<span');
    expect(result.html).toContain('<p>keep</p>');
  });

  it('clean: removes empty class/style/id attrs', async () => {
    const mockPage = createMockPage();
    mockPage.content = vi.fn(() => Promise.resolve('<div class="" style="" id="">content</div>'));
    const result = await queryCommands.html(mockPage, { clean: true });
    expect(result.html).not.toContain('class=""');
    expect(result.html).not.toContain('style=""');
    expect(result.html).not.toContain('id=""');
  });

  it('clean: trims whitespace between tags', async () => {
    const mockPage = createMockPage();
    mockPage.content = vi.fn(() => Promise.resolve('  <div>content</div>  '));
    const result = await queryCommands.html(mockPage, { clean: true });
    expect(result.html).toBe('<div>content</div>');
  });
});

describe('queryCommands - text', () => {
  it('gets text content with selector', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.text(mockPage, { selector: '#content' });
    expect(result.text).toBe('body text');
  });

  it('defaults to body selector', async () => {
    const mockPage = createMockPage();
    await queryCommands.text(mockPage, {});
    const calls = (mockPage.textContent as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('body');
  });
});

describe('queryCommands - inputValue', () => {
  it('gets input value via locator', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.inputValue(mockPage, { selector: '#email' });
    expect(result.value).toBe('input-val');
  });
});

describe('queryCommands - textContent', () => {
  it('gets text content via locator', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.textContent(mockPage, { selector: '#desc' });
    expect(result.text).toBe('locator-text');
  });
});

describe('queryCommands - getAttribute', () => {
  it('gets attribute value', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.getAttribute(mockPage, { selector: '#link', name: 'href' });
    expect(result.value).toBe('attr-value');
  });
});

describe('queryCommands - structure with real DOM', () => {
  it('handles extractor not loaded gracefully', async () => {
    const mockPage = createMockPage();
    const result = await queryCommands.structure(mockPage, {});
    expect(result.yaml).toBe('Extractor not loaded');
    expect(result.structure).toBeNull();
  });

  it('defaults selector to body', async () => {
    const mockPage = createMockPage();
    await queryCommands.structure(mockPage, {});
    const evalCalls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(evalCalls[0][1]).toBe('body');
  });

  it('adds script tag before evaluating', async () => {
    const callOrder: string[] = [];
    const mockPage = createMockPage();
    mockPage.addScriptTag = vi.fn(() => {
      callOrder.push('addScriptTag');
      return Promise.resolve();
    });
    mockPage.evaluate = vi.fn(() => {
      callOrder.push('evaluate');
      return Promise.resolve({ layout: null, yaml: '' });
    });
    await queryCommands.structure(mockPage, { selector: 'body' });
    expect(callOrder).toEqual(['addScriptTag', 'evaluate']);
  });

  it('injects __structureExtractor in script content', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve({ layout: null, yaml: '' }));
    await queryCommands.structure(mockPage, {});
    const scriptArg = (mockPage.addScriptTag as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Record<string, unknown>;
    expect(scriptArg.content).toContain('__structureExtractor');
  });
});
