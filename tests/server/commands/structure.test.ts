import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

type StructureNode = Record<string, unknown>;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function extractStructure(rootEl: Element): StructureNode | null {
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
  ]);
  const formTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'FORM']);
  const listTagNames = ['UL', 'OL', 'DL', 'MENU'];

  function getSelector(el: Element): string {
    if (el.id) return '#' + el.id;
    const classes = (el.className || '')
      .toString()
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('reds-') && !c.startsWith('_'));
    if (classes.length > 0) return '.' + classes.slice(0, 2).join('.');
    return el.tagName.toLowerCase();
  }

  function getRegionType(el: Element): string | undefined {
    const tag = el.tagName;
    const role = el.getAttribute('role');
    const className = (el.className || '').toString().toLowerCase();

    if (role === 'navigation' || tag === 'NAV' || className.includes('nav')) return 'navigation';
    if (role === 'banner' || tag === 'HEADER') return 'header';
    if (role === 'contentinfo' || tag === 'FOOTER') return 'footer';
    if (role === 'main' || tag === 'MAIN') return 'main';
    if (role === 'complementary' || tag === 'ASIDE' || className.includes('sidebar'))
      return 'sidebar';
    if (tag === 'FORM' || className.includes('form') || className.includes('search')) return 'form';
    if (tag === 'SECTION' || tag === 'ARTICLE') return 'section';
    if (listTagNames.includes(tag) || role === 'list') return 'list';
    return undefined;
  }

  function getInteractiveInfo(el: Element): StructureNode | null {
    const tag = el.tagName;

    if (tag === 'INPUT') {
      const inputType = el.getAttribute('type') || 'text';
      const name = el.getAttribute('name') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      return {
        type: 'input',
        inputType,
        selector: getSelector(el),
        name,
        placeholder,
      };
    }

    if (tag === 'TEXTAREA') {
      const name = el.getAttribute('name') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      return {
        type: 'textarea',
        selector: getSelector(el),
        name,
        placeholder,
      };
    }

    if (tag === 'SELECT') {
      const name = el.getAttribute('name') || '';
      const options = Array.from(el.querySelectorAll('option')).map(
        (o) => o.textContent?.trim() || ''
      );
      return {
        type: 'select',
        selector: getSelector(el),
        name,
        options: options.slice(0, 10),
      };
    }

    if (tag === 'BUTTON') {
      const text = el.textContent?.trim().slice(0, 50) || '';
      return {
        type: 'button',
        selector: getSelector(el),
        text,
      };
    }

    if (tag === 'A') {
      const text = el.textContent?.trim().slice(0, 50) || '';
      const href = el.getAttribute('href') || '';
      return {
        type: 'link',
        selector: getSelector(el),
        text,
        href,
      };
    }

    return null;
  }

  function hasFormElements(el: Element): boolean {
    return el.querySelectorAll('input, textarea, select').length >= 1;
  }

  function isSameStructure(a: Element, b: Element): boolean {
    if (a.tagName !== b.tagName) return false;
    const aClass = (a.className || '').toString().split(' ')[0];
    const bClass = (b.className || '').toString().split(' ')[0];
    if (aClass !== bClass) return false;
    const aChildren = Array.from(a.children).filter((c) => !excludeTags.has(c.tagName));
    const bChildren = Array.from(b.children).filter((c) => !excludeTags.has(c.tagName));
    if (aChildren.length !== bChildren.length) return false;
    return true;
  }

  function groupChildren(children: Element[]): Array<{ element: Element; count: number }> {
    const groups: Array<{ element: Element; count: number }> = [];

    for (const child of children) {
      if (groups.length > 0) {
        const last = groups[groups.length - 1];
        if (isSameStructure(last.element, child)) {
          last.count++;
          continue;
        }
      }
      groups.push({ element: child, count: 1 });
    }

    return groups;
  }

  function buildStructure(el: Element): StructureNode | null {
    if (excludeTags.has(el.tagName)) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const region = getRegionType(el);
    const interactive = getInteractiveInfo(el);
    const hasForm = hasFormElements(el);

    const node: StructureNode = { tag, selector };

    if (region) {
      node.region = region;
    } else if (hasForm && !formTags.has(el.tagName)) {
      node.region = 'form-area';
    }

    if (interactive) {
      node.interactive = interactive;
    }

    const directChildren = Array.from(el.children).filter((c) => !excludeTags.has(c.tagName));

    if (directChildren.length > 0) {
      const groups = groupChildren(directChildren);
      const childNodes: Array<StructureNode> = [];

      for (const group of groups) {
        const childNode = buildStructure(group.element);
        if (childNode) {
          if (group.count > 1) {
            childNode.count = group.count;
          }
          childNodes.push(childNode);
        }
      }

      if (childNodes.length > 0) {
        node.children = childNodes;
      }
    }

    const htmlSize = el.outerHTML.length;
    if (htmlSize >= 1024) {
      node.size = formatSize(htmlSize);
    }

    return node;
  }

  return buildStructure(rootEl);
}

const fixturePath = path.join(__dirname, '../../fixtures/sample.html');

describe('Structure Extraction', () => {
  it('should extract structure from sample HTML', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const root = dom.window.document.body;

    const structure = extractStructure(root);

    expect(structure).toBeDefined();
    expect(structure).toHaveProperty('tag', 'body');
    expect(structure).toHaveProperty('children');
  });

  it('should identify header region', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const header = dom.window.document.querySelector('#main-header');

    const structure = extractStructure(header!);

    expect(structure).toHaveProperty('region', 'header');
  });

  it('should identify navigation region', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const nav = dom.window.document.querySelector('.nav-bar');

    const structure = extractStructure(nav!);

    expect(structure).toHaveProperty('region', 'navigation');
  });

  it('should identify form elements with selectors', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const searchInput = dom.window.document.querySelector('#search-input');

    const structure = extractStructure(searchInput!);

    expect(structure).toHaveProperty('interactive');
    expect(structure!.interactive).toHaveProperty('type', 'input');
    expect(structure!.interactive).toHaveProperty('selector', '#search-input');
    expect(structure!.interactive).toHaveProperty('placeholder', '搜索...');
  });

  it('should group repeated elements', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const navLinks = dom.window.document.querySelector('.nav-links');

    const structure = extractStructure(navLinks!);

    expect(structure).toHaveProperty('children');
    const children = structure!.children as Array<StructureNode>;
    expect(children.length).toBe(1);
    expect(children[0]).toHaveProperty('count', 4);
  });

  it('should identify sidebar region', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const aside = dom.window.document.querySelector('.sidebar');

    const structure = extractStructure(aside!);

    expect(structure).toHaveProperty('region', 'sidebar');
  });

  it('should identify form region and form-area', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const form = dom.window.document.querySelector('#contact-form');

    const structure = extractStructure(form!);

    expect(structure).toHaveProperty('region', 'form');
  });

  it('should extract all interactive elements in form', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const form = dom.window.document.querySelector('#contact-form');

    const structure = extractStructure(form!);
    const children = structure!.children as Array<StructureNode>;

    const allInteractive: StructureNode[] = [];
    function collectInteractive(nodes: StructureNode[]) {
      for (const node of nodes) {
        if (node.interactive) allInteractive.push(node);
        if (node.children) collectInteractive(node.children as StructureNode[]);
      }
    }
    collectInteractive(children);
    expect(allInteractive.length).toBeGreaterThanOrEqual(2);
  });

  it('should group product cards', () => {
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const dom = new JSDOM(html);
    const productList = dom.window.document.querySelector('.product-list');

    const structure = extractStructure(productList!);
    const children = structure!.children as Array<StructureNode>;

    expect(children.length).toBe(1);
    expect(children[0]).toHaveProperty('count', 3);
    expect(children[0]).toHaveProperty('tag', 'div');
  });
});
