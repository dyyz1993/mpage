import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LayoutNode = {
  type: string;
  selector?: string;
  xpath?: string;
  region?: string;
  keywords?: string[];
  role?: string;
  hasForm?: boolean;
  hasSearch?: boolean;
  inputCount?: number;
  buttonCount?: number;
  linkCount?: number;
  isHidden?: boolean;
  isActive?: boolean;
  size?: string;
  a11ySize?: string;
  repeatCount?: number;
  isDynamic?: boolean;
  children?: LayoutNode[];
};

const IMPORTANT_KEYWORDS = [
  'content',
  'container',
  'main',
  'sidebar',
  'header',
  'footer',
  'nav',
  'search',
  'form',
  'list',
  'card',
  'feed',
  'item',
  'post',
  'article',
  'comment',
  'user',
  'profile',
  'recommend',
  'suggest',
  'category',
  'tag',
  'tab',
  'modal',
  'dialog',
  'dropdown',
  'menu',
  'button',
  'input',
  'login',
  'register',
  'cart',
  'checkout',
  'price',
  'product',
  'detail',
  'info',
  'action',
  'settings',
  'notification',
  'message',
  'avatar',
  'icon',
  'logo',
  'brand',
  'title',
  'description',
  'image',
  'video',
  'audio',
  'player',
  'map',
  'calendar',
  'table',
  'chart',
  'graph',
  'filter',
  'sort',
  'pagination',
  'breadcrumb',
];

const SEMANTIC_KEYWORDS = new Set([
  'content',
  'main',
  'sidebar',
  'header',
  'footer',
  'nav',
  'search',
  'form',
  'list',
  'card',
  'feed',
  'item',
  'post',
  'article',
  'comment',
  'user',
  'profile',
  'recommend',
  'suggest',
  'category',
  'tag',
  'tab',
  'modal',
  'dialog',
  'dropdown',
  'menu',
  'scroll',
  'slide',
  'pagination',
  'action',
  'share',
  'like',
  'favorite',
  'notification',
  'login',
  'register',
]);

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
  ]);

  function getSelector(el: Element): string {
    const semanticTags = new Set([
      'ARTICLE',
      'SECTION',
      'NAV',
      'MAIN',
      'ASIDE',
      'HEADER',
      'FOOTER',
      'FORM',
      'FIGURE',
      'FIGcapTION',
      'DIALOG',
      'DETAILS',
      'SUMMARY',
      'ADDRESS',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
    ]);

    if (semanticTags.has(el.tagName)) {
      return el.tagName.toLowerCase();
    }

    const id = el.id;
    if (id && !id.startsWith(':') && !/^[a-z]?[0-9a-f]{6,}$/i.test(id) && id.length < 30) {
      return '#' + id;
    }
    const testId = el.getAttribute('data-testid');
    if (testId && testId.length < 30) {
      return `[data-testid="${testId}"]`;
    }
    const e2e = el.getAttribute('data-e2e');
    if (e2e && e2e.length > 1 && e2e.length < 30) {
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

  function getXPath(el: Element): string {
    const parts: string[] = [];
    let current: Element | null = el;

    while (current && current.tagName !== 'HTML') {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          parts.unshift(`${tag}[${index}]`);
        } else {
          parts.unshift(tag);
        }
      } else {
        parts.unshift(tag);
      }
      current = parent;
    }

    return '/' + parts.join('/');
  }

  function extractKeywords(el: Element): string[] {
    const keywords: string[] = [];
    const className = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toLowerCase();

    const allText = `${className} ${id}`;

    for (const keyword of IMPORTANT_KEYWORDS) {
      const patterns = [
        '-' + keyword + '-',
        '-' + keyword,
        keyword + '-',
        '_' + keyword,
        keyword + '_',
        keyword + 's',
        keyword + '-item',
        keyword + '-card',
        keyword + '-list',
        keyword + '-container',
        keyword + '-wrapper',
      ];
      for (const pattern of patterns) {
        if (allText.includes(pattern)) {
          keywords.push(keyword);
          break;
        }
      }
    }

    return [...new Set(keywords)].filter((k) => SEMANTIC_KEYWORDS.has(k));
  }

  function getRegionType(el: Element): string | undefined {
    const tag = el.tagName;
    const role = el.getAttribute('role');
    const keywords = extractKeywords(el);

    if (role === 'navigation' || tag === 'NAV' || keywords.includes('nav')) return 'nav';
    if (role === 'banner' || tag === 'HEADER') return 'header';
    if (role === 'contentinfo' || tag === 'FOOTER') return 'footer';
    if (role === 'main' || tag === 'MAIN') return 'main';
    if (role === 'complementary' || tag === 'ASIDE' || keywords.includes('sidebar'))
      return 'sidebar';
    if (tag === 'FORM' || keywords.includes('form')) return 'form';
    if (keywords.includes('search')) return 'search';
    if (tag === 'SECTION' || tag === 'ARTICLE') return 'section';
    if (['UL', 'OL', 'DL', 'MENU'].includes(tag) || role === 'list') return 'list';
    if (tag === 'TABLE') return 'table';
    if (keywords.includes('modal') || keywords.includes('dialog') || role === 'dialog')
      return 'modal';
    if (keywords.includes('tab') || role === 'tablist') return 'tabs';
    if (keywords.includes('card')) return 'card';
    if (keywords.includes('feed')) return 'feed';
    if (keywords.includes('comment')) return 'comments';
    if (keywords.includes('recommend') || keywords.includes('suggest')) return 'recommend';
    if (keywords.includes('category') || keywords.includes('tag')) return 'category';
    if (keywords.includes('user') || keywords.includes('profile')) return 'user';
    if (keywords.includes('article') || keywords.includes('post') || keywords.includes('note'))
      return 'article';
    if (keywords.includes('item')) return 'item';
    if (keywords.includes('list')) return 'list';
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
    return false;
  }

  function isActive(el: Element): boolean {
    const keywords = extractKeywords(el);
    if (keywords.includes('active')) return true;
    if (keywords.includes('selected')) return true;
    if (el.getAttribute('aria-selected') === 'true') return true;
    if (el.getAttribute('aria-current') === 'true') return true;
    return false;
  }

  function isSearchInput(el: Element): boolean {
    if (el.tagName !== 'INPUT') return false;
    const type = el.getAttribute('type') || 'text';
    if (type === 'hidden' || type === 'submit' || type === 'button') return false;
    const keywords = extractKeywords(el);
    if (keywords.includes('search')) return true;
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    if (placeholder.includes('search') || placeholder.includes('搜索')) return true;
    return false;
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

  function calculateA11ySize(el: Element): number {
    function walk(node: Element): string {
      const tag = node.tagName;
      if (
        [
          'SCRIPT',
          'STYLE',
          'NOSCRIPT',
          'META',
          'LINK',
          'HEAD',
          'HTML',
          'SVG',
          'PATH',
          'G',
        ].includes(tag)
      ) {
        return '';
      }

      const role =
        node.getAttribute('role') ||
        (tag === 'BUTTON'
          ? 'button'
          : tag === 'A'
            ? 'link'
            : tag === 'INPUT'
              ? 'textbox'
              : tag === 'TEXTAREA'
                ? 'textbox'
                : tag === 'SELECT'
                  ? 'combobox'
                  : tag === 'IMG'
                    ? 'img'
                    : tag === 'H1' ||
                        tag === 'H2' ||
                        tag === 'H3' ||
                        tag === 'H4' ||
                        tag === 'H5' ||
                        tag === 'H6'
                      ? 'heading'
                      : tag === 'UL' || tag === 'OL'
                        ? 'list'
                        : tag === 'LI'
                          ? 'listitem'
                          : tag === 'NAV'
                            ? 'navigation'
                            : tag === 'MAIN'
                              ? 'main'
                              : tag === 'HEADER'
                                ? 'banner'
                                : tag === 'FOOTER'
                                  ? 'contentinfo'
                                  : tag === 'FORM'
                                    ? 'form'
                                    : null);

      const name =
        node.getAttribute('aria-label') ||
        node.getAttribute('alt') ||
        node.getAttribute('title') ||
        (tag === 'INPUT' || tag === 'TEXTAREA' ? node.getAttribute('placeholder') : '');

      let directText = '';
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const txt = (child.textContent || '').trim();
          if (txt) directText += (directText ? ' ' : '') + txt;
        }
      }

      const finalName = name || (directText ? directText.slice(0, 100) : '');

      let result = '';
      if (role || finalName) {
        result = `- ${role || 'item'}${finalName ? ` "${finalName.slice(0, 50)}"` : ''}\n`;
      }

      for (const child of Array.from(node.children)) {
        result += walk(child);
      }

      return result;
    }

    return walk(el).length;
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
            last.node.isDynamic = true;
          }
          mergeChildren(last.node, node);
          continue;
        }
      }
      groups.push({ node, count: 1 });
    }

    return groups;
  }

  function mergeChildren(target: LayoutNode, source: LayoutNode): void {
    if (!target.children || !source.children) return;

    const targetChildren = target.children;
    const sourceChildren = source.children;

    const maxLen = Math.max(targetChildren.length, sourceChildren.length);
    const minLen = Math.min(targetChildren.length, sourceChildren.length);

    for (let i = 0; i < minLen; i++) {
      const tc = targetChildren[i];
      const sc = sourceChildren[i];

      if (tc.selector && sc.selector && tc.selector !== sc.selector) {
        tc.selector = normalizeSelector(tc.selector);
        tc.isDynamic = true;
      }

      if (tc.children && sc.children) {
        mergeChildren(tc, sc);
      }
    }

    if (targetChildren.length < sourceChildren.length) {
      for (let i = minLen; i < maxLen; i++) {
        const sc = sourceChildren[i];
        sc.isDynamic = true;
        targetChildren.push(sc);
      }
    }
  }

  function isSameLayoutNode(a: LayoutNode, b: LayoutNode): boolean {
    if (a.type !== b.type) return false;
    if (a.region !== b.region) return false;
    if (!isSimilarSelector(a.selector, b.selector)) return false;

    if (a.type === 'article') {
      return true;
    }

    if (Math.abs((a.inputCount || 0) - (b.inputCount || 0)) > 1) return false;
    if (Math.abs((a.buttonCount || 0) - (b.buttonCount || 0)) > 1) return false;
    if (Math.abs((a.linkCount || 0) - (b.linkCount || 0)) > 3) return false;
    if (!hasSimilarChildren(a, b)) return false;
    return true;
  }

  function hasSimilarChildren(a: LayoutNode, b: LayoutNode): boolean {
    if (!a.children && !b.children) return true;
    if (!a.children || !b.children) return false;
    if (Math.abs(a.children.length - b.children.length) > 3) return false;
    const aFirstType = a.children[0]?.type;
    const bFirstType = b.children[0]?.type;
    if (aFirstType !== bFirstType) return false;
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
    if (extractKeywords(el).length > 0) return false;
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
    if (depth > 20) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const keywords = extractKeywords(el);
    const region = getRegionType(el);
    const counts = countInteractive(el);
    const hidden = isHidden(el);
    const active = isActive(el);
    const htmlSize = el.outerHTML.length;

    const node: LayoutNode = { type: tag };

    if (selector) {
      node.selector = selector;
      node.xpath = getXPath(el);
    }
    if (keywords.length > 0) node.keywords = keywords.slice(0, 3);
    if (region) node.region = region;
    if (hidden) node.isHidden = true;
    if (active) node.isActive = true;

    const role = el.getAttribute('role');
    if (role) node.role = role;

    if (htmlSize >= 1024) {
      node.size = formatSize(htmlSize);
    }

    const a11yLen = calculateA11ySize(el);
    if (a11yLen > 0 && a11yLen < htmlSize) {
      node.a11ySize = formatSize(a11yLen);
    }

    if (isSearchInput(el)) {
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
        if (!region && keywords.length === 0 && !selector) {
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
      keywords.length > 0 ||
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
  if (node.keywords) {
    for (const k of node.keywords) {
      addPart(k);
    }
  }
  if (node.isHidden) addPart('hidden');
  if (node.isActive) addPart('active');
  if (node.hasSearch) addPart('search');
  if (node.hasForm) addPart('form');
  if (node.inputCount) addPart(`i:${node.inputCount}`);
  if (node.buttonCount) addPart(`b:${node.buttonCount}`);
  if (node.linkCount) addPart(`l:${node.linkCount}`);
  if (node.repeatCount) addPart(`×${node.repeatCount}`);
  if (node.isDynamic) addPart('*');
  if (node.size) {
    if (node.a11ySize) {
      addPart(`${node.size}→${node.a11ySize}`);
    } else {
      addPart(node.size);
    }
  }

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

const websitesDir = path.join(__dirname, '../tests/fixtures/websites');
const outputDir = path.join(__dirname, '../tests/fixtures/layouts-medium');

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(websitesDir).filter((f) => f.endsWith('.html'));

  console.log(`开始提取 ${files.length} 个网站的中等详细度布局结构...\n`);

  for (const file of files) {
    const name = file.replace('.html', '');
    const htmlPath = path.join(websitesDir, file);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const layout = extractLayoutMedium(dom.window.document.body);
    const yaml = layoutToYaml(layout);

    const outputPath = path.join(outputDir, `${name}.txt`);
    fs.writeFileSync(outputPath, yaml, 'utf-8');

    console.log(`✓ ${name} (${(html.length / 1024).toFixed(1)}KB -> ${yaml.length}B)`);
  }

  console.log(`\n完成！结果保存在 ${outputDir}`);
}

main().catch(console.error);
