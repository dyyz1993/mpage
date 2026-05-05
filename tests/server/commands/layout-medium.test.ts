import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

interface LayoutNode {
  type: string;
  selector?: string;
  region?: string;
  keywords?: string[];
  isHidden?: boolean;
  isActive?: boolean;
  role?: string;
  hasSearch?: boolean;
  hasForm?: boolean;
  inputCount?: number;
  buttonCount?: number;
  linkCount?: number;
  repeatCount?: number;
  size?: string;
  a11ySize?: string;
  isDynamic?: boolean;
  children?: LayoutNode[];
  xpath?: string;
}

function extractLayoutMedium(rootEl: Element): LayoutNode | null {
  const excludeTags = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'META',
    'LINK',
    'HEAD',
    'HTML',
    'TITLE',
    'SVG',
    'svg',
    'PATH',
    'path',
    'G',
    'g',
    'DEFS',
    'defs',
    'USE',
    'use',
    'CIRCLE',
    'circle',
    'RECT',
    'rect',
    'POLYGON',
    'polygon',
    'LINE',
    'line',
    'POLYLINE',
    'polyline',
    'SYMBOL',
    'symbol',
    'SPAN',
    'EM',
    'STRONG',
    'B',
    'I',
    'SMALL',
    'MARK',
    'DEL',
    'INS',
    'SUB',
    'SUP',
    'ABBR',
    'CODE',
    'KBD',
    'SAMP',
    'VAR',
    'TIME',
    'DATA',
    'METER',
    'BR',
    'WBR',
    'PICTURE',
    'SOURCE',
    'TRACK',
    'AREA',
    'MAP',
    'PARAM',
    'OPTGROUP',
    'OPTION',
    'TEXTAREA',
    'PROGRESS',
    'DATALIST',
    'OUTPUT',
    'SLOT',
    'TEMPLATE',
    'CITE',
    'Q',
    'RB',
    'RT',
    'RP',
    'RUBY',
    'BDO',
    'BDI',
    'COL',
    'COLGROUP',
    'TFOOT',
    'THEAD',
    'TH',
    'TD',
    'CAPTION',
    'TBODY',
    'TR',
    'CLIPPATH',
    'clippath',
    'MASK',
    'mask',
    'LINEARGRADIENT',
    'lineargradient',
    'STOP',
    'stop',
  ]);

  const semanticTags = new Set([
    'HEADER',
    'NAV',
    'MAIN',
    'ASIDE',
    'FOOTER',
    'SECTION',
    'ARTICLE',
    'FORM',
    'UL',
    'OL',
    'DL',
    'MENU',
    'TABLE',
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'BUTTON',
    'A',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'FIGURE',
    'FIGCAPTION',
    'DIALOG',
    'SUMMARY',
    'DETAILS',
    'ADDRESS',
    'TIME',
    'MARK',
    'IMG',
    'VIDEO',
    'AUDIO',
    'CANVAS',
    'IFRAME',
    'EMBED',
    'OBJECT',
  ]);

  function isHidden(el: Element): boolean {
    const style = (el as HTMLElement).style;
    if (style) {
      if (style.display === 'none') return true;
      if (style.visibility === 'hidden') return true;
    }
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    return false;
  }

  function isActive(el: Element): boolean {
    const style = (el as HTMLElement).style;
    if (style) {
      if (style.display === 'flex') return true;
    }
    return false;
  }

  function getSelector(el: Element): string {
    const id = el.id;
    if (id && !id.startsWith(':') && !/^[a-z]?[0-9a-f]{6,}$/i.test(id) && id.length < 30) {
      return '#' + id;
    }
    const testId = el.getAttribute('data-testid');
    if (testId && testId.length < 30) {
      return `[data-testid="${testId}"]`;
    }
    const e2e = el.getAttribute('data-e2e');
    if (e2e && e2e.length > 0 && e2e.length < 30) {
      return `[data-e2e="${e2e}"]`;
    }
    const classAttr = el.getAttribute('class') || '';
    const classes = classAttr
      .trim()
      .split(/\s+/)
      .filter(
        (c) =>
          c &&
          !c.startsWith('reds-') &&
          !c.startsWith('_') &&
          !c.startsWith('css-') &&
          !c.startsWith('prc-') &&
          !c.startsWith('sc-') &&
          !c.startsWith('r-') &&
          !isUtilityClass(c) &&
          !/^[a-z]?[0-9a-f]{6,}$/i.test(c) &&
          !/^[a-z][a-z0-9]{5,}$/i.test(c) &&
          c.length > 2 &&
          c.length < 30 &&
          /[a-z]{3,}/i.test(c)
      );
    if (classes.length > 0) return '.' + classes[0];
    return '';
  }

  function isUtilityClass(c: string): boolean {
    const utilityPrefixes = [
      'bg-',
      'text-',
      'border-',
      'p-',
      'm-',
      'px-',
      'py-',
      'mx-',
      'my-',
      'pt-',
      'pb-',
      'pl-',
      'pr-',
      'mt-',
      'mb-',
      'ml-',
      'mr-',
      'w-',
      'h-',
      'min-',
      'max-',
      'top-',
      'bottom-',
      'left-',
      'right-',
      'flex',
      'grid',
      'block',
      'inline',
      'hidden',
      'absolute',
      'relative',
      'fixed',
      'sticky',
      'rounded',
      'shadow',
      'opacity',
      'transition',
      'duration',
      'ease',
      'scale',
      'transform',
      'rotate',
      'translate',
      'z-',
      'gap-',
      'space-',
      'items-',
      'justify-',
      'self-',
      'overflow',
      'cursor',
      'select',
      'pointer',
      'hover:',
      'focus:',
      'active:',
      'disabled:',
      'sm:',
      'md:',
      'lg:',
      'xl:',
      '2xl:',
      'dark:',
      'light:',
      'font-',
      'leading-',
      'tracking-',
      'uppercase',
      'lowercase',
      'capitalize',
      'whitespace',
      'break-',
      'truncate',
      'line-clamp',
      'ring-',
      'outline',
      'appearance',
      'sr-only',
      'not-',
      'divide-',
      'place-',
      'content-',
      'wrap',
      'nowrap',
      'reverse',
      'grow',
      'shrink',
      'basis-',
      'order-',
      'col-',
      'row-',
      'float',
      'clear',
      'visible',
      'invisible',
      'opacity-',
      'isolate',
      'isolation',
      'mix-blend',
      'bg-blend',
      'fill',
      'stroke',
      'object-',
      'inset-',
      'start-',
      'end-',
      'container',
      'aspect-',
      'columns-',
      'indent',
      'align-',
    ];
    for (const prefix of utilityPrefixes) {
      if (c.startsWith(prefix) || c === prefix.replace(/-$/, '')) {
        return true;
      }
    }
    if (/^[a-z]{1,2}-[0-9]+$/.test(c)) return true;
    if (/^\[.+\]$/.test(c)) return true;
    return false;
  }

  function getRegionType(el: Element): string | undefined {
    const tag = el.tagName;
    const role = el.getAttribute('role');
    const className = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toLowerCase();

    if (role === 'navigation' || tag === 'NAV' || className.includes('nav') || id.includes('nav')) {
      return 'nav';
    }
    if (role === 'banner' || tag === 'HEADER') return 'header';
    if (role === 'contentinfo' || tag === 'FOOTER') return 'footer';
    if (role === 'main' || tag === 'MAIN') return 'main';
    if (
      role === 'complementary' ||
      tag === 'ASIDE' ||
      className.includes('sidebar') ||
      id.includes('sidebar')
    ) {
      return 'sidebar';
    }
    if (tag === 'FORM' || className.includes('form') || id.includes('form')) return 'form';
    if (className.includes('search') || id.includes('search')) return 'search';
    if (tag === 'SECTION' || tag === 'ARTICLE') return 'section';
    if (['UL', 'OL', 'DL', 'MENU'].includes(tag) || role === 'list') return 'list';
    if (tag === 'TABLE') return 'table';
    return undefined;
  }

  function countInteractive(el: Element): { inputs: number; buttons: number; links: number } {
    const inputs = el.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
    );
    const buttons = el.querySelectorAll('button, input[type="submit"], input[type="button"]');
    const links = el.querySelectorAll('a[href]');
    return { inputs: inputs.length, buttons: buttons.length, links: links.length };
  }

  function groupChildrenByLayout(nodes: LayoutNode[]): Array<{ node: LayoutNode; count: number }> {
    const groups: Array<{ node: LayoutNode; count: number }> = [];

    for (const node of nodes) {
      if (groups.length > 0) {
        const last = groups[groups.length - 1];
        if (isSameLayoutNode(last.node, node)) {
          last.count++;
          if (last.node.selector && node.selector && last.node.selector !== node.selector) {
            last.node.selector = normalizeSelector(last.node.selector);
          }
          continue;
        }
      }
      groups.push({ node, count: 1 });
    }

    return groups;
  }

  function isSameLayoutNode(a: LayoutNode, b: LayoutNode): boolean {
    if (a.type !== b.type) return false;
    if (a.region !== b.region) return false;
    if (!isSimilarSelector(a.selector, b.selector)) return false;
    if ((a.inputCount || 0) !== (b.inputCount || 0)) return false;
    if ((a.buttonCount || 0) !== (b.buttonCount || 0)) return false;
    return true;
  }

  function isSimilarSelector(a: string | undefined, b: string | undefined): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a === b) return true;

    const patternA = normalizeSelector(a);
    const patternB = normalizeSelector(b);
    return patternA === patternB;
  }

  function normalizeSelector(selector: string): string {
    return selector
      .replace(/-[0-9]+(-[0-9]+)?$/g, '-*')
      .replace(/-[A-Za-z]+$/g, '-*')
      .replace(/_[a-z0-9]{6,}$/gi, '_*')
      .replace(/[0-9]+/g, '*');
  }

  function isPassThrough(el: Element, childNode?: LayoutNode): boolean {
    if (semanticTags.has(el.tagName)) return false;
    if (getRegionType(el)) return false;
    if (getSelector(el)) return false;
    if (childNode) {
      const counts = countInteractive(el);
      const childInputs = childNode.inputCount || 0;
      const childButtons = childNode.buttonCount || 0;
      const childLinks = childNode.linkCount || 0;
      if (
        counts.inputs === childInputs &&
        counts.buttons === childButtons &&
        counts.links === childLinks
      ) {
        return true;
      }
    }
    const counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return false;
    return true;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function buildLayout(el: Element, depth: number = 0): LayoutNode | null {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 10) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const region = getRegionType(el);
    const counts = countInteractive(el);
    const hidden = isHidden(el);
    const active = isActive(el);
    const htmlSize = el.outerHTML.length;

    const node: LayoutNode = { type: tag };

    if (selector) node.selector = selector;
    if (region) node.region = region;
    if (hidden) node.isHidden = true;
    if (active) node.isActive = true;

    const role = el.getAttribute('role');
    if (role) node.role = role;

    if (htmlSize >= 1024) {
      node.size = formatSize(htmlSize);
    }

    if (region === 'form' || counts.inputs > 0) {
      node.hasForm = true;
      if (counts.inputs > 0) node.inputCount = counts.inputs;
      if (counts.buttons > 0) node.buttonCount = counts.buttons;
    }

    if (counts.links > 0 && counts.links <= 10) {
      node.linkCount = counts.links;
    }

    const directChildren = Array.from(el.children);

    if (directChildren.length > 0) {
      const childNodes: LayoutNode[] = [];

      for (const child of directChildren) {
        if (excludeTags.has(child.tagName)) continue;

        const childNode = buildLayout(child, depth + 1);
        if (childNode) {
          childNodes.push(childNode);
        }
      }

      const groups = groupChildrenByLayout(childNodes);

      const groupedChildNodes: LayoutNode[] = [];
      for (const group of groups) {
        if (group.count > 1) {
          group.node.repeatCount = group.count;
        }
        groupedChildNodes.push(group.node);
      }

      if (groupedChildNodes.length === 1 && isPassThrough(el, groupedChildNodes[0])) {
        const singleChild = groupedChildNodes[0];
        if (!region && !selector) {
          singleChild.selector = selector || singleChild.selector;
          return singleChild;
        }
      }

      if (groupedChildNodes.length > 0) {
        node.children = groupedChildNodes;
      }
    }

    const hasContent =
      selector ||
      region ||
      counts.inputs > 0 ||
      counts.buttons > 0 ||
      counts.links > 0 ||
      node.children;

    if (!hasContent) return null;

    return node;
  }

  return buildLayout(rootEl);
}

function layoutToYaml(node: LayoutNode | null, indent: number = 0): string {
  if (!node) return '';

  const spaces = '  '.repeat(indent);
  let line = spaces;

  const selector = node.selector || node.type;
  const parts: string[] = [];
  const seen = new Set<string>();

  const addPart = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      parts.push(p);
    }
  };

  if (node.role) addPart(node.role);
  if (node.region) addPart(node.region);
  if (node.isHidden) addPart('hidden');
  if (node.isActive) addPart('active');
  if (node.hasForm) addPart('form');
  if (node.inputCount) addPart(`i:${node.inputCount}`);
  if (node.buttonCount) addPart(`b:${node.buttonCount}`);
  if (node.linkCount) addPart(`l:${node.linkCount}`);
  if (node.repeatCount) addPart(`×${node.repeatCount}`);
  if (node.size) addPart(node.size);

  const hasSignificantInfo =
    parts.length > 0 ||
    node.inputCount ||
    node.buttonCount ||
    node.linkCount ||
    node.repeatCount ||
    node.size;

  if (!node.selector && node.type === 'div') {
    if (node.children) {
      let childResult = '';
      for (const child of node.children) {
        childResult += layoutToYaml(child, indent);
      }
      return childResult;
    }
    return '';
  }

  if (!hasSignificantInfo && !node.selector) {
    return '';
  }

  if (parts.length > 0) {
    line += `${selector}: [${parts.join(' ')}]`;
  } else if (node.selector) {
    line += `${selector}: [${node.type}]`;
  } else {
    return '';
  }

  let result = line + '\n';

  if (node.children) {
    for (const child of node.children) {
      result += layoutToYaml(child, indent + 1);
    }
  }

  return result;
}

describe('Layout Medium Extraction', () => {
  it('should filter SVG symbol elements', () => {
    const html = `
      <svg id="__svg__icons__dom__">
        <symbol id="icon-a"><path d="M0 0"></path></symbol>
        <symbol id="icon-b"><path d="M0 0"></path></symbol>
      </svg>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('icon-a')).toBeFalsy();
    expect(yaml.includes('icon-b')).toBeFalsy();
  });

  it('should filter Tailwind utility classes', () => {
    const html = `
      <div class="bg-transparent border-neutral-border-weak p-4 m-2">Content</div>
      <div class="header-container">Header</div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('bg-transparent')).toBeFalsy();
    expect(yaml.includes('border-neutral')).toBeFalsy();
    expect(yaml.includes('.header-container')).toBeTruthy();
  });

  it('should support data-testid selector', () => {
    const html = `
      <div data-testid="login-button">Login</div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('[data-testid="login-button"]')).toBeTruthy();
  });

  it('should support data-e2e selector', () => {
    const html = `
      <div data-e2e="recommend-list-item">Item 1</div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('[data-e2e="recommend-list-item"]')).toBeTruthy();
  });

  it('should normalize similar selectors', () => {
    const html = `
      <div id="vjs-track-option-296-50">Option 1</div>
      <div id="vjs-track-option-297-75">Option 2</div>
      <div id="vjs-track-option-298-100">Option 3</div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('#vjs-track-option-*')).toBeTruthy();
    expect(yaml.includes('×3')).toBeTruthy();
  });

  it('should group similar layout nodes', () => {
    const html = `
      <div class="note-item">Note 1</div>
      <div class="note-item">Note 2</div>
      <div class="note-item">Note 3</div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('.note-item')).toBeTruthy();
    expect(yaml.includes('×3')).toBeTruthy();
  });

  it('should preserve children when parent div has no selector', () => {
    const html = `
      <div class="css-random-hash">
        <main id="main-content">Main Content</main>
      </div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('#main-content')).toBeTruthy();
  });

  it('should mark dynamic content with *', () => {
    const html = `
      <div class="footer-column">
        <a href="/link1">Link 1</a>
      </div>
      <div class="footer-column">
        <a href="/link2">Link 2</a>
      </div>
      <div class="footer-column">
        <a href="/link3">Link 3</a>
      </div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('.footer-column')).toBeTruthy();
    expect(yaml.includes('×3')).toBeTruthy();
  });

  it('should merge similar structures with different children', () => {
    const html = `
      <div class="l-stack">
        <a href="/a1">A1</a>
        <a href="/a2">A2</a>
      </div>
      <div class="l-stack">
        <a href="/b1">B1</a>
        <a href="/b2">B2</a>
        <a href="/b3">B3</a>
      </div>
    `;
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);
    expect(yaml.includes('.l-stack')).toBeTruthy();
    expect(yaml.includes('×2')).toBeTruthy();
  });
});
