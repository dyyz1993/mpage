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

    if (role === 'navigation' || tag === 'NAV' || className.includes('nav') || id.includes('nav'))
      return 'nav';
    if (role === 'banner' || tag === 'HEADER') return 'header';
    if (role === 'contentinfo' || tag === 'FOOTER') return 'footer';
    if (role === 'main' || tag === 'MAIN') return 'main';
    if (
      role === 'complementary' ||
      tag === 'ASIDE' ||
      className.includes('sidebar') ||
      id.includes('sidebar')
    )
      return 'sidebar';
    if (tag === 'FORM' || className.includes('form') || id.includes('form')) return 'form';
    if (className.includes('search') || id.includes('search')) return 'search';
    if (tag === 'SECTION' || tag === 'ARTICLE') return 'section';
    if (['UL', 'OL', 'DL', 'MENU'].includes(tag) || role === 'list') return 'list';
    if (tag === 'TABLE') return 'table';
    return undefined;
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

  function buildLayout(el: Element, depth: number = 0): LayoutNode | null {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 6) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const region = getRegionType(el);
    const counts = countInteractive(el);

    const node: LayoutNode = { type: tag };

    if (selector) node.selector = selector;
    if (region) node.region = region;

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

      if (childNodes.length > 0) {
        node.children = childNodes;
      }
    }

    return node;
  }

  return buildLayout(rootEl);
}

function layoutToYaml(node: LayoutNode | null, indent: number = 0): string {
  if (!node) return '';
  const spaces = '  '.repeat(indent);

  let line = `${spaces}- ${node.type}`;
  if (node.selector) line += ` [${node.selector}]`;
  if (node.region) line += ` (${node.region})`;
  if (node.repeatCount) line += ` ×${node.repeatCount}`;

  const tags: string[] = [];
  if (node.hasSearch) tags.push('🔍search');
  if (node.hasForm) tags.push('📝form');
  if (node.inputCount) tags.push(`inputs:${node.inputCount}`);
  if (node.buttonCount) tags.push(`buttons:${node.buttonCount}`);
  if (node.linkCount) tags.push(`links:${node.linkCount}`);
  if (tags.length > 0) line += ` {${tags.join(', ')}}`;

  let result = line + '\n';

  if (node.children) {
    for (const child of node.children) {
      result += layoutToYaml(child, indent + 1);
    }
  }

  return result;
}

const websitesDir = path.join(__dirname, '../../fixtures/websites');

describe('Layout Extraction', () => {
  it('should extract layout from sample HTML', () => {
    const htmlPath = path.join(__dirname, '../../fixtures/sample.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const body = dom.window.document.body;

    const layout = extractLayout(body);

    console.log('\n========== Sample HTML Layout ==========\n');
    console.log(layoutToYaml(layout));
    console.log('========================================\n');

    expect(layout).toBeDefined();
    expect(layout?.type).toBe('body');
  });

  const testSites = ['github', 'google', 'taobao', 'bilibili', 'zhihu'];

  for (const site of testSites) {
    it(`should extract layout from ${site}`, () => {
      const htmlPath = path.join(websitesDir, `${site}.html`);
      if (!fs.existsSync(htmlPath)) {
        console.log(`${site}.html not found, skipping`);
        return;
      }

      const html = fs.readFileSync(htmlPath, 'utf-8');
      const dom = new JSDOM(html);
      const body = dom.window.document.body;

      const layout = extractLayout(body);

      console.log(`\n========== ${site} Layout ==========\n`);
      console.log(layoutToYaml(layout));
      console.log('====================================\n');

      expect(layout).toBeDefined();
    });
  }

  it('should generate layout summary for all websites', () => {
    const files = fs.existsSync(websitesDir)
      ? fs.readdirSync(websitesDir).filter((f) => f.endsWith('.html'))
      : [];

    console.log('\n\n========== Layout Summary ==========\n');

    const results: Array<{
      name: string;
      regions: string[];
      hasSearch: boolean;
      hasForm: boolean;
    }> = [];

    function collectInfo(
      node: LayoutNode | null,
      regions: Set<string>,
      info: { hasSearch: boolean; hasForm: boolean }
    ) {
      if (!node) return;
      if (node.region) regions.add(node.region);
      if (node.hasSearch) info.hasSearch = true;
      if (node.hasForm) info.hasForm = true;
      if (node.children) {
        for (const child of node.children) {
          collectInfo(child, regions, info);
        }
      }
    }

    for (const file of files.slice(0, 20)) {
      const name = file.replace('.html', '');
      const html = fs.readFileSync(path.join(websitesDir, file), 'utf-8');
      const dom = new JSDOM(html);
      const layout = extractLayout(dom.window.document.body);

      const regions = new Set<string>();
      const info = { hasSearch: false, hasForm: false };

      collectInfo(layout, regions, info);

      results.push({
        name,
        regions: Array.from(regions),
        hasSearch: info.hasSearch,
        hasForm: info.hasForm,
      });
    }

    for (const r of results) {
      const icons = [];
      if (r.hasSearch) icons.push('🔍');
      if (r.hasForm) icons.push('📝');
      console.log(`${r.name}: [${r.regions.join(', ')}] ${icons.join(' ')}`);
    }

    console.log('\n====================================\n');

    expect(results.length).toBeGreaterThan(0);
  });
});
