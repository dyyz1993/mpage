import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LayoutNode = {
  type: string;
  selector?: string;
  region?: string;
  keywords?: string[];
  hasForm?: boolean;
  hasSearch?: boolean;
  inputCount?: number;
  buttonCount?: number;
  linkCount?: number;
  repeatCount?: number;
  isHidden?: boolean;
  isActive?: boolean;
  size?: string;
  children?: LayoutNode[];
};

const IMPORTANT_KEYWORDS = [
  'content',
  'container',
  'wrapper',
  'main',
  'sidebar',
  'header',
  'footer',
  'nav',
  'menu',
  'search',
  'form',
  'list',
  'item',
  'card',
  'feed',
  'post',
  'article',
  'comment',
  'user',
  'profile',
  'recommend',
  'suggest',
  'popular',
  'trending',
  'category',
  'tag',
  'label',
  'button',
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'toggle',
  'switch',
  'tab',
  'panel',
  'modal',
  'dialog',
  'popup',
  'overlay',
  'dropdown',
  'select',
  'option',
  'active',
  'selected',
  'disabled',
  'hidden',
  'visible',
  'loading',
  'error',
  'success',
  'warning',
  'info',
  'notice',
  'message',
  'alert',
  'badge',
  'count',
  'number',
  'text',
  'title',
  'description',
  'image',
  'img',
  'video',
  'audio',
  'media',
  'icon',
  'logo',
  'avatar',
  'thumbnail',
  'preview',
  'detail',
  'more',
  'expand',
  'collapse',
  'show',
  'hide',
  'open',
  'close',
  'prev',
  'next',
  'first',
  'last',
  'page',
  'pagination',
  'scroll',
  'slide',
  'carousel',
  'slider',
  'progress',
  'status',
  'action',
  'share',
  'like',
  'favorite',
  'bookmark',
  'follow',
  'subscribe',
  'notification',
  'setting',
  'config',
  'option',
  'preference',
  'account',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'profile',
  'dashboard',
  'home',
  'index',
  'about',
  'contact',
  'help',
  'faq',
  'support',
  'feedback',
  'report',
  'search',
  'filter',
  'sort',
  'order',
  'group',
  'section',
  'block',
  'box',
  'area',
  'zone',
  'region',
  'slot',
  'placeholder',
  'skeleton',
  'shimmer',
  'spinner',
  'loader',
];

function extractLayoutDetailed(rootEl: Element): LayoutNode | null {
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
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'BUTTON',
    'A',
    'IMG',
    'VIDEO',
    'AUDIO',
    'IFRAME',
  ]);

  function getSelector(el: Element): string {
    if (el.id) return '#' + el.id;
    const classes = (el.className || '')
      .toString()
      .trim()
      .split(/\s+/)
      .filter(
        (c) =>
          c &&
          !c.startsWith('reds-') &&
          !c.startsWith('_') &&
          !c.startsWith('css-') &&
          !c.startsWith('prc-')
      );
    if (classes.length > 0) return '.' + classes.slice(0, 2).join('.');
    return '';
  }

  function extractKeywords(el: Element): string[] {
    const keywords: string[] = [];
    const className = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toLowerCase();
    const dataAttrs = Array.from(el.attributes)
      .filter((a) => a.name.startsWith('data-'))
      .map((a) => a.value.toLowerCase())
      .join(' ');

    const allText = `${className} ${id} ${dataAttrs}`;

    for (const keyword of IMPORTANT_KEYWORDS) {
      const patterns = [keyword, keyword + '-', '-' + keyword, '_' + keyword, keyword + '_'];
      for (const pattern of patterns) {
        if (allText.includes(pattern)) {
          keywords.push(keyword);
          break;
        }
      }
    }

    return [...new Set(keywords)];
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
    const keywords = extractKeywords(el);
    if (keywords.includes('hidden')) return true;
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

  function isSameLayout(a: Element, b: Element): boolean {
    if (a.tagName !== b.tagName) return false;
    const aKeywords = extractKeywords(a).slice(0, 3).sort().join(',');
    const bKeywords = extractKeywords(b).slice(0, 3).sort().join(',');
    if (aKeywords !== bKeywords) return false;
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

    const keywords = extractKeywords(el);
    if (keywords.length > 0) return true;

    const region = getRegionType(el);
    if (region) return true;

    const counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return true;

    return false;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function buildLayout(el: Element, depth: number = 0): LayoutNode | null {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 8) return null;

    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);
    const keywords = extractKeywords(el);
    const region = getRegionType(el);
    const counts = countInteractive(el);
    const hidden = isHidden(el);
    const active = isActive(el);
    const htmlSize = el.outerHTML.length;

    const node: LayoutNode = { type: tag };

    if (selector) node.selector = selector;
    if (keywords.length > 0) node.keywords = keywords.slice(0, 5);
    if (region) node.region = region;
    if (hidden) node.isHidden = true;
    if (active) node.isActive = true;
    if (htmlSize >= 1024) node.size = formatSize(htmlSize);

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

    const directChildren = Array.from(el.children).filter(shouldInclude);

    if (directChildren.length > 0) {
      const groups = groupChildren(directChildren);
      const childNodes: LayoutNode[] = [];

      for (const group of groups) {
        const childNode = buildLayout(group.element, depth + 1);
        if (childNode) {
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

function layoutToAscii(
  node: LayoutNode | null,
  prefix: string = '',
  isLast: boolean = true
): string {
  if (!node) return '';

  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = isLast ? '    ' : '│   ';

  let line = prefix + connector;

  if (node.isHidden) line += '[HIDDEN] ';
  if (node.isActive) line += '[ACTIVE] ';
  if (node.region) line += `[${node.region.toUpperCase()}] `;

  line += node.type;
  if (node.selector) line += ` ${node.selector}`;

  const tags: string[] = [];
  if (node.keywords && node.keywords.length > 0) tags.push(node.keywords.join(','));
  if (node.hasSearch) tags.push('🔍');
  if (node.hasForm) tags.push('📝');
  if (node.inputCount && node.inputCount <= 5) tags.push(`i:${node.inputCount}`);
  if (node.buttonCount && node.buttonCount <= 5) tags.push(`b:${node.buttonCount}`);
  if (node.linkCount && node.linkCount <= 10) tags.push(`l:${node.linkCount}`);
  if (node.repeatCount) tags.push(`×${node.repeatCount}`);
  if (node.size) tags.push(node.size);

  if (tags.length > 0) line += ` {${tags.join(' | ')}}`;

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

const websitesDir = path.join(__dirname, '../tests/fixtures/websites');
const outputDir = path.join(__dirname, '../tests/fixtures/layouts-detailed');

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(websitesDir).filter((f) => f.endsWith('.html'));

  console.log(`开始提取 ${files.length} 个网站的详细布局结构...\n`);

  for (const file of files) {
    const name = file.replace('.html', '');
    const htmlPath = path.join(websitesDir, file);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const layout = extractLayoutDetailed(dom.window.document.body);
    const ascii = layoutToAscii(layout);

    const outputPath = path.join(outputDir, `${name}.txt`);
    fs.writeFileSync(outputPath, ascii, 'utf-8');

    console.log(`✓ ${name} (${(html.length / 1024).toFixed(1)}KB -> ${ascii.length}B)`);
  }

  console.log(`\n完成！结果保存在 ${outputDir}`);
}

main().catch(console.error);
