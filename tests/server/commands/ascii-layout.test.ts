import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

type LayoutNode = {
  type: string;
  selector?: string;
  region?: string;
  hasForm?: boolean;
  hasSearch?: boolean;
  inputCount?: number;
  buttonCount?: number;
  linkCount?: number;
  repeatCount?: number;
  isHidden?: boolean;
  size?: string;
  children?: LayoutNode[];
};

function extractLayout(rootEl: Element): LayoutNode | null {
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
    'PATH',
    'G',
    'DEFS',
    'USE',
    'CIRCLE',
    'RECT',
    'POLYGON',
    'LINE',
    'POLYLINE',
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
    'FIGURE',
    'FIGCAPTION',
    'DETAILS',
    'SUMMARY',
    'DIALOG',
  ]);

  const layoutTags = new Set([
    'DIV',
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
  ]);

  function getSelector(el: Element): string {
    if (el.id) return '#' + el.id;
    const classes = (el.className || '')
      .toString()
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('reds-') && !c.startsWith('_') && !c.startsWith('css-'));
    if (classes.length > 0) return '.' + classes[0];
    return '';
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

  function isHidden(el: Element): boolean {
    const style = (el as HTMLElement).style;
    if (style) {
      if (style.display === 'none') return true;
      if (style.visibility === 'hidden') return true;
    }
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    const className = (el.className || '').toString().toLowerCase();
    if (
      className.includes('hidden') ||
      className.includes('hide') ||
      className.includes('invisible')
    ) {
      return true;
    }
    return false;
  }

  function isSearchInput(el: Element): boolean {
    if (el.tagName !== 'INPUT') return false;
    const type = el.getAttribute('type') || 'text';
    if (type === 'hidden' || type === 'submit' || type === 'button') return false;
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const className = (el.className || '').toString().toLowerCase();
    return (
      placeholder.includes('search') ||
      placeholder.includes('搜索') ||
      placeholder.includes('搜') ||
      name.includes('search') ||
      name.includes('kw') ||
      name.includes('q') ||
      id.includes('search') ||
      id.includes('kw') ||
      className.includes('search')
    );
  }

  function countInteractive(el: Element): {
    inputs: number;
    buttons: number;
    links: number;
    searchInputs: number;
  } {
    const inputs = el.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
    );
    const buttons = el.querySelectorAll('button, input[type="submit"], input[type="button"]');
    const links = el.querySelectorAll('a[href]');
    const searchInputs = Array.from(el.querySelectorAll('input')).filter(isSearchInput);
    return {
      inputs: inputs.length,
      buttons: buttons.length,
      links: links.length,
      searchInputs: searchInputs.length,
    };
  }

  function isSameLayout(a: Element, b: Element): boolean {
    if (a.tagName !== b.tagName) return false;
    const aRegion = getRegionType(a);
    const bRegion = getRegionType(b);
    if (aRegion !== bRegion) return false;
    const aClass = (a.className || '').toString().split(' ')[0];
    const bClass = (b.className || '').toString().split(' ')[0];
    if (aClass !== bClass) return false;
    const aChildren = Array.from(a.children).filter((c) => layoutTags.has(c.tagName));
    const bChildren = Array.from(b.children).filter((c) => layoutTags.has(c.tagName));
    if (aChildren.length !== bChildren.length) return false;
    return true;
  }

  function groupChildren(children: Element[]): Array<{ element: Element; count: number }> {
    const groups: Array<{ element: Element; count: number }> = [];

    for (const child of children) {
      if (groups.length > 0) {
        const last = groups[groups.length - 1];
        if (isSameLayout(last.element, child)) {
          last.count++;
          continue;
        }
      }
      groups.push({ element: child, count: 1 });
    }

    return groups;
  }

  function shouldInclude(el: Element): boolean {
    const tag = el.tagName;
    if (excludeTags.has(tag)) return false;
    if (semanticTags.has(tag)) return true;
    if (layoutTags.has(tag)) return true;
    const region = getRegionType(el);
    if (region) return true;
    const counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return true;
    const className = (el.className || '').toString().toLowerCase();
    if (
      className.includes('container') ||
      className.includes('wrapper') ||
      className.includes('content') ||
      className.includes('layout') ||
      className.includes('main') ||
      className.includes('sidebar') ||
      className.includes('header') ||
      className.includes('footer')
    ) {
      return true;
    }
    return false;
  }

  function hasSignificantContent(el: Element): boolean {
    const tag = el.tagName;
    if (semanticTags.has(tag)) return true;
    const region = getRegionType(el);
    if (region) return true;
    const counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0 || counts.links > 5) return true;
    const directChildren = Array.from(el.children).filter(shouldInclude);
    if (directChildren.length > 1) return true;
    return false;
  }

  function isPassThrough(el: Element): boolean {
    if (semanticTags.has(el.tagName)) return false;
    if (getRegionType(el)) return false;
    const counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return false;
    const className = (el.className || '').toString().toLowerCase();
    if (
      className.includes('container') ||
      className.includes('wrapper') ||
      className.includes('content') ||
      className.includes('layout')
    ) {
      return true;
    }
    return false;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function buildLayout(el: Element, depth: number = 0): LayoutNode | null {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 6) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const region = getRegionType(el);
    const counts = countInteractive(el);
    const hidden = isHidden(el);
    const htmlSize = el.outerHTML.length;

    const node: LayoutNode = { type: tag };

    if (selector) node.selector = selector;
    if (region) node.region = region;
    if (hidden) node.isHidden = true;
    if (htmlSize >= 1024) node.size = formatSize(htmlSize);

    if (counts.searchInputs > 0) {
      node.hasSearch = true;
    }

    if (region === 'form' || counts.inputs > 0) {
      node.hasForm = true;
      if (counts.inputs > 0) node.inputCount = counts.inputs;
      if (counts.buttons > 0) node.buttonCount = counts.buttons;
    }

    if (counts.links > 0 && counts.links <= 10) {
      node.linkCount = counts.links;
    }

    const directChildren = Array.from(el.children).filter(shouldInclude);

    if (directChildren.length > 0) {
      const groups = groupChildren(directChildren);
      const childNodes: LayoutNode[] = [];

      for (const group of groups) {
        const childNode = buildLayout(group.element, depth + 1);
        if (childNode && hasSignificantContent(group.element)) {
          if (group.count > 1) {
            childNode.repeatCount = group.count;
          }
          childNodes.push(childNode);
        }
      }

      if (childNodes.length === 1 && isPassThrough(el)) {
        const singleChild = childNodes[0];
        if (!region) {
          singleChild.selector = selector || singleChild.selector;
          return singleChild;
        }
      }

      if (childNodes.length > 0) {
        node.children = childNodes;
      }
    }

    return node;
  }

  return buildLayout(rootEl);
}

function layoutToAscii(
  node: LayoutNode | null,
  prefix: string = '',
  isLast: boolean = true
): string {
  if (!node) return '';

  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = isLast ? '    ' : '│   ';

  let line = prefix + connector;

  if (node.isHidden) {
    line += '[HIDDEN] ';
  }

  if (node.region) {
    line += `[${node.region.toUpperCase()}] `;
  }

  line += node.type;
  if (node.selector) line += ` ${node.selector}`;

  const tags: string[] = [];
  if (node.hasSearch) tags.push('🔍');
  if (node.hasForm) tags.push('📝');
  if (node.inputCount && node.inputCount <= 5) tags.push(`i:${node.inputCount}`);
  if (node.buttonCount && node.buttonCount <= 5) tags.push(`b:${node.buttonCount}`);
  if (node.linkCount && node.linkCount <= 10) tags.push(`l:${node.linkCount}`);
  if (node.repeatCount) tags.push(`×${node.repeatCount}`);
  if (node.size) tags.push(node.size);

  if (tags.length > 0) line += ` {${tags.join(', ')}}`;

  let result = line + '\n';

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isLastChild = i === node.children.length - 1;
      result += layoutToAscii(child, prefix + childPrefix, isLastChild);
    }
  }

  return result;
}

const websitesDir = path.join(__dirname, '../../fixtures/websites');

describe('Layout ASCII Output', () => {
  it('should show GitHub layout in ASCII format', () => {
    const htmlPath = path.join(websitesDir, 'github.html');
    if (!fs.existsSync(htmlPath)) {
      console.log('github.html not found, skipping');
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const layout = extractLayout(dom.window.document.body);

    console.log('\n========== GitHub ASCII Layout ==========\n');
    console.log(layoutToAscii(layout));
    console.log('==========================================\n');

    expect(layout).toBeDefined();
  });

  it('should show sample HTML layout in ASCII format', () => {
    const htmlPath = path.join(__dirname, '../../fixtures/sample.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const layout = extractLayout(dom.window.document.body);

    console.log('\n========== Sample ASCII Layout ==========\n');
    console.log(layoutToAscii(layout));
    console.log('==========================================\n');

    expect(layout).toBeDefined();
  });

  it('should show Xiaohongshu layout in ASCII format', () => {
    const htmlPath = path.join(websitesDir, 'xiaohongshu.html');
    if (!fs.existsSync(htmlPath)) {
      console.log('xiaohongshu.html not found, skipping');
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const layout = extractLayout(dom.window.document.body);

    console.log('\n========== 小红书 ASCII Layout ==========\n');
    console.log(layoutToAscii(layout));
    console.log('==========================================\n');

    expect(layout).toBeDefined();
  });
});
