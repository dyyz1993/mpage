import { describe, it, expect, vi, beforeAll } from 'vitest';
import { snapshotCommands } from '../../../src/server/commands/snapshot.js';
import type { Page, Locator } from 'playwright-core';
import { JSDOM } from 'jsdom';

let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM(
    '<!DOCTYPE html><html><head></head><body>' +
      '<div id="root">' +
      '<button id="btn" aria-label="Submit">Submit</button>' +
      '<a href="/home" class="nav-link active">Home</a>' +
      '<input id="search" placeholder="Search..." />' +
      '<textarea id="desc" placeholder="Description"></textarea>' +
      '<select id="lang"><option value="en">English</option></select>' +
      '<img id="logo" alt="Logo" src="/logo.png" />' +
      '<h1 id="title">Page Title</h1>' +
      '<h2>Subtitle</h2>' +
      '<ul><li>Item 1</li><li>Item 2</li></ul>' +
      '<nav id="main-nav"><a href="/about">About</a></nav>' +
      '<main id="content"><p>Content</p></main>' +
      '<header id="hdr">Header</header>' +
      '<footer id="ftr">Footer</footer>' +
      '<form id="myform" action="/submit"><input name="q" /></form>' +
      '<table><tr><td>Cell</td><th>Header</th></tr></table>' +
      '<span class="reds-ignored real-class">Text</span>' +
      '<div class="active">Active Div</div>' +
      '<input id="disabled-input" disabled />' +
      '<p id="named" title="Named Element">text</p>' +
      '</div>' +
      '</body></html>',
    { pretendToBeVisual: true }
  );
});

function createMockPage(overrides: Record<string, unknown> = {}, customDom?: JSDOM): Page {
  const mockLocatorFirst: Locator = {
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('img-data-selector'))),
  } as unknown as Locator;

  const mockLocator: Locator = {
    first: vi.fn(() => mockLocatorFirst),
    ariaSnapshot: vi.fn(() => Promise.resolve('- button "Submit"')),
  } as unknown as Locator;

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
    locator: vi.fn(() => mockLocator),
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('screenshot-data'))),
    ...overrides,
  } as unknown as Page;
}

describe('snapshotCommands - screenshot', () => {
  it('generates default filename with timestamp', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshot(mockPage, {});
    expect(result.path).toContain('screenshot-');
    expect(result.path).toContain('.png');
  });

  it('uses custom path from args', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshot(mockPage, { path: 'custom.png' });
    expect(result.path).toContain('custom.png');
  });

  it('passes extra args to page.screenshot', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshot(mockPage, { fullPage: true, type: 'jpeg' });
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.fullPage).toBe(true);
    expect(opts.type).toBe('jpeg');
  });

  it('uses subdirectory in path', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshot(mockPage, { path: 'sub/dir/test.png' });
    expect(result.path).toContain('sub/dir/test.png');
  });
});

describe('snapshotCommands - screenshotBase64', () => {
  it('returns base64 data for full page screenshot', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { fullPage: true });
    const expected = Buffer.from('screenshot-data').toString('base64');
    expect(result.screenshot).toBe(expected);
    expect(result.data).toBe(expected);
    expect(result.format).toBe('png');
    expect(result.size).toBe(Buffer.from('screenshot-data').length);
  });

  it('defaults fullPage to false', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, {});
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.fullPage).toBe(false);
  });

  it('respects type=jpeg', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { type: 'jpeg' });
    expect(result.format).toBe('jpeg');
  });

  it('passes quality option when provided', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, { quality: 80 });
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.quality).toBe(80);
  });

  it('does not include quality when undefined', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, {});
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.quality).toBeUndefined();
  });

  it('takes element screenshot when selector is provided', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { selector: '#el' });
    expect(result.screenshot).toBe(Buffer.from('img-data-selector').toString('base64'));
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('#el');
  });

  it('element screenshot with type and quality', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, {
      selector: '.card',
      type: 'jpeg',
      quality: 50,
    });
    expect(result.format).toBe('jpeg');
  });

  it('defaults format to png when no type specified', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, {});
    expect(result.format).toBe('png');
  });

  it('full page screenshot does not call locator', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, { fullPage: true });
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('snapshotCommands - a11y with real DOM', () => {
  it('walks button element with role inference', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#btn', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('button');
    expect(snap.name).toBe('Submit');
    expect(snap.tag).toBe('button');
  });

  it('walks link element with href', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'a[href="/home"]',
      format: 'json',
    });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('link');
    expect(snap.href).toBe('/home');
  });

  it('walks input with placeholder as name', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#search', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('textbox');
    expect(snap.name).toBe('Search...');
  });

  it('walks textarea with textbox role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#desc', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('textbox');
    expect(snap.name).toBe('Description');
  });

  it('walks select with combobox role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#lang', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('combobox');
  });

  it('walks img with img role and alt', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#logo', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('img');
    expect(snap.name).toBe('Logo');
  });

  it('walks h1 with heading role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#title', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('heading');
    expect(snap.name).toBe('Page Title');
  });

  it('walks h2 with heading role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: 'h2', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('heading');
  });

  it('walks ul with list role and li children', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: 'ul', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('list');
    const children = snap.children as Record<string, unknown>[];
    expect(children.length).toBeGreaterThan(0);
    expect(children[0].role).toBe('listitem');
  });

  it('walks nav with navigation role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#main-nav', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('navigation');
  });

  it('walks main element with main role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#content', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('main');
  });

  it('walks header with banner role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#hdr', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('banner');
  });

  it('walks footer with contentinfo role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#ftr', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('contentinfo');
  });

  it('walks form with form role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#myform', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('form');
  });

  it('walks table with table role, tr with row, td/th with cell', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: 'table', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('table');
    const tbody = snap.children as Record<string, unknown>[];
    expect(tbody.length).toBeGreaterThan(0);
    const rows = tbody[0].children as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    const cells = rows[0].children as Record<string, unknown>[];
    expect(cells[0].role).toBe('cell');
    expect(cells[1].role).toBe('cell');
  });

  it('walks span with text role', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'span.real-class',
      format: 'json',
    });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.role).toBe('text');
    expect(snap.selector).toBe('.real-class');
  });

  it('filters out reds- prefixed classes in selector', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'span.real-class',
      format: 'json',
    });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.selector as string).not.toContain('reds-');
  });

  it('detects disabled attribute', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: '#disabled-input',
      format: 'json',
    });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.disabled).toBe(true);
  });

  it('uses title attribute as name', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#named', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.name).toBe('Named Element');
  });

  it('skips script/style/noscript/meta/link/head/html tags', async () => {
    const domSkip = new JSDOM(
      '<script>var x=1;</script><style>.a{}</style><noscript>no</noscript>'
    );
    const mockPage = createMockPage({}, domSkip);
    const result = await snapshotCommands.a11y(mockPage, { selector: 'script', format: 'json' });
    expect(result.snapshot).toBeNull();
  });

  it('returns null for element with no role, no name, no children', async () => {
    const domEmpty = new JSDOM('<div id="empty"></div>');
    const mockPage = createMockPage({}, domEmpty);
    const result = await snapshotCommands.a11y(mockPage, { selector: '#empty', format: 'json' });
    expect(result.snapshot).toBeNull();
  });

  it('uses id as cssSelector when available', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#btn', format: 'json' });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.id).toBe('btn');
    expect(snap.selector).toBe('#btn');
  });

  it('uses className as cssSelector when no id', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'a.nav-link',
      format: 'json',
    });
    const snap = result.snapshot as Record<string, unknown>;
    expect(snap.selector).toContain('.nav-link');
  });
});

describe('snapshotCommands - a11y yaml format', () => {
  it('renders yaml with role and quoted name', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: '#btn', format: 'yaml' });
    expect(result.snapshot).toContain('button "Submit"');
  });

  it('renders yaml with active checkmark for .active selector', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'div.active',
      format: 'yaml',
    });
    expect(result.snapshot as string).toContain('✓');
  });

  it('renders yaml with href for links', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: 'a[href="/home"]',
      format: 'yaml',
    });
    expect(result.snapshot as string).toContain('href: /home');
  });

  it('renders yaml with disabled', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {
      selector: '#disabled-input',
      format: 'yaml',
    });
    expect(result.snapshot as string).toContain('disabled: true');
  });

  it('renders nested children with indentation', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { selector: 'ul', format: 'yaml' });
    const yaml = result.snapshot as string;
    expect(yaml).toContain('- list');
    expect(yaml).toContain('- listitem');
  });

  it('defaults selector to body and returns yaml', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, { format: 'yaml' });
    expect(typeof result.snapshot).toBe('string');
  });

  it('defaults format to yaml', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.a11y(mockPage, {});
    expect(typeof result.snapshot).toBe('string');
  });

  it('renders tag-based header when no role and no name', async () => {
    const domTag = new JSDOM('<div id="outer"><p>content</p></div>');
    const mockPage = createMockPage({}, domTag);
    const result = await snapshotCommands.a11y(mockPage, { selector: '#outer', format: 'yaml' });
    expect(typeof result.snapshot).toBe('string');
  });
});

describe('snapshotCommands - snapshot', () => {
  it('returns aria snapshot for given selector', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.snapshot(mockPage, { selector: '#main' });
    expect(result.snapshot).toBe('- button "Submit"');
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('#main');
  });

  it('defaults selector to body', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.snapshot(mockPage, {});
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('body');
  });
});
