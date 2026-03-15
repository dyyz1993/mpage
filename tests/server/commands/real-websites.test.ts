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
      return {
        type: 'input',
        inputType: el.getAttribute('type') || 'text',
        selector: getSelector(el),
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
      };
    }

    if (tag === 'TEXTAREA') {
      return {
        type: 'textarea',
        selector: getSelector(el),
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
      };
    }

    if (tag === 'SELECT') {
      const options = Array.from(el.querySelectorAll('option')).map(
        (o) => o.textContent?.trim() || ''
      );
      return {
        type: 'select',
        selector: getSelector(el),
        name: el.getAttribute('name') || '',
        options: options.slice(0, 10),
      };
    }

    if (tag === 'BUTTON') {
      return {
        type: 'button',
        selector: getSelector(el),
        text: el.textContent?.trim().slice(0, 50) || '',
      };
    }

    if (tag === 'A') {
      return {
        type: 'link',
        selector: getSelector(el),
        text: el.textContent?.trim().slice(0, 50) || '',
        href: el.getAttribute('href') || '',
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

function collectInteractive(nodes: StructureNode | StructureNode[] | undefined): StructureNode[] {
  const result: StructureNode[] = [];
  if (!nodes) return result;

  const arr = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of arr) {
    if (node.interactive) result.push(node);
    if (node.children) {
      result.push(...collectInteractive(node.children as StructureNode[]));
    }
  }
  return result;
}

function hasRegion(structure: StructureNode | null, region: string): boolean {
  if (!structure) return false;
  if (structure.region === region) return true;
  if (structure.children) {
    for (const child of structure.children as StructureNode[]) {
      if (hasRegion(child, region)) return true;
    }
  }
  return false;
}

function structureToYaml(node: StructureNode | null, indent: number = 0): string {
  if (!node) return '';
  const spaces = '  '.repeat(indent);

  let line = `${spaces}- ${node.tag}`;
  if (node.selector) line += ` [${node.selector}]`;
  if (node.region) line += ` (${node.region})`;
  if (node.count) line += ` ×${node.count}`;
  if (node.size) line += ` {${node.size}}`;

  let result = line + '\n';

  if (node.interactive) {
    const inter = node.interactive as StructureNode;
    let interLine = `${spaces}  ↳ interactive: ${inter.type}`;
    if (inter.selector) interLine += ` [${inter.selector}]`;
    if (inter.placeholder) interLine += ` placeholder="${inter.placeholder}"`;
    if (inter.text) interLine += ` text="${inter.text}"`;
    if (inter.href) interLine += ` href="${inter.href}"`;
    result += interLine + '\n';
  }

  if (node.children) {
    for (const child of node.children as StructureNode[]) {
      result += structureToYaml(child, indent + 1);
    }
  }

  return result;
}

const websitesDir = path.join(__dirname, '../../fixtures/websites');

const websiteExpectations: Array<{
  name: string;
  category: string;
  description: string;
  minInteractive?: number;
  hasInput?: boolean;
  hasLink?: boolean;
  hasButton?: boolean;
  regions?: string[];
  hasSearchForm?: boolean;
  hasListGrouped?: boolean;
}> = [
  {
    name: 'google',
    category: 'search',
    description: '搜索引擎首页',
    minInteractive: 1,
    hasInput: true,
    hasButton: true,
  },
  {
    name: 'baidu',
    category: 'search',
    description: '百度搜索首页',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'github',
    category: 'tech',
    description: 'GitHub首页',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
    regions: ['navigation'],
  },
  {
    name: 'npm',
    category: 'tech',
    description: 'NPM包管理',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'zhihu',
    category: 'social',
    description: '知乎问答社区',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'weibo',
    category: 'social',
    description: '微博社交平台',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'xiaohongshu',
    category: 'social',
    description: '小红书社区',
    minInteractive: 1,
    hasInput: true,
  },
  {
    name: 'bilibili',
    category: 'video',
    description: 'B站视频平台',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'youtube',
    category: 'video',
    description: 'YouTube视频平台',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'taobao',
    category: 'ecommerce',
    description: '淘宝电商',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
    hasListGrouped: true,
  },
  {
    name: 'jd',
    category: 'ecommerce',
    description: '京东电商',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'amazon',
    category: 'ecommerce',
    description: '亚马逊电商',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'twitter',
    category: 'social',
    description: 'Twitter社交',
    minInteractive: 1,
    hasLink: true,
  },
  {
    name: 'linkedin',
    category: 'social',
    description: 'LinkedIn职场社交',
    minInteractive: 1,
    hasLink: true,
  },
  {
    name: 'reddit',
    category: 'social',
    description: 'Reddit社区',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'tiktok',
    category: 'video',
    description: 'TikTok短视频',
    minInteractive: 1,
    hasInput: true,
  },
  { name: 'netflix', category: 'video', description: 'Netflix流媒体', minInteractive: 0 },
  {
    name: 'douban',
    category: 'social',
    description: '豆瓣社区',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'meituan',
    category: 'local',
    description: '美团本地生活',
    minInteractive: 1,
    hasInput: false,
  },
  {
    name: 'dianping',
    category: 'local',
    description: '大众点评',
    minInteractive: 1,
    hasInput: true,
  },
  {
    name: 'ctrip',
    category: 'travel',
    description: '携程旅游',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'airbnb',
    category: 'travel',
    description: 'Airbnb民宿',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  { name: 'zhipin', category: 'job', description: 'BOSS直聘', minInteractive: 0 },
  { name: 'lagou', category: 'job', description: '拉勾招聘', minInteractive: 0 },
  { name: 'indeed', category: 'job', description: 'Indeed招聘', minInteractive: 1, hasInput: true },
  {
    name: 'juejin',
    category: 'tech',
    description: '掘金技术社区',
    minInteractive: 1,
    hasInput: true,
    hasLink: true,
  },
  {
    name: 'csdn',
    category: 'tech',
    description: 'CSDN技术社区',
    minInteractive: 1,
    hasInput: true,
  },
  {
    name: 'segmentfault',
    category: 'tech',
    description: 'SegmentFault技术社区',
    minInteractive: 1,
    hasInput: true,
  },
  { name: 'deepseek', category: 'ai', description: 'DeepSeek AI', minInteractive: 0 },
  { name: 'openai', category: 'ai', description: 'OpenAI官网', minInteractive: 1, hasLink: true },
  {
    name: 'huggingface',
    category: 'ai',
    description: 'HuggingFace AI平台',
    minInteractive: 1,
    hasInput: true,
    hasSearchForm: true,
  },
  {
    name: 'vercel',
    category: 'tech',
    description: 'Vercel部署平台',
    minInteractive: 1,
    hasLink: true,
    hasButton: true,
  },
  {
    name: 'netlify',
    category: 'tech',
    description: 'Netlify部署平台',
    minInteractive: 1,
    hasLink: true,
  },
  { name: 'apple', category: 'company', description: '苹果官网', minInteractive: 1, hasLink: true },
  {
    name: 'alibaba',
    category: 'company',
    description: '阿里巴巴官网',
    minInteractive: 1,
    hasLink: true,
  },
  {
    name: 'tencent',
    category: 'company',
    description: '腾讯官网',
    minInteractive: 1,
    hasLink: true,
  },
  {
    name: 'bytedance',
    category: 'company',
    description: '字节跳动官网',
    minInteractive: 1,
    hasLink: true,
  },
  {
    name: 'notion',
    category: 'productivity',
    description: 'Notion协作工具',
    minInteractive: 1,
    hasInput: false,
    hasButton: true,
  },
  {
    name: 'trello',
    category: 'productivity',
    description: 'Trello项目管理',
    minInteractive: 1,
    hasButton: true,
  },
];

describe('Website Structure Validation', () => {
  function findGrouped(node: StructureNode | null): boolean {
    if (!node) return false;
    if (node.count && (node.count as number) > 1) return true;
    if (node.children) {
      for (const child of node.children as StructureNode[]) {
        if (findGrouped(child)) return true;
      }
    }
    return false;
  }

  for (const expected of websiteExpectations) {
    const htmlPath = path.join(websitesDir, `${expected.name}.html`);

    (fs.existsSync(htmlPath) ? it : it.skip)(
      `should validate ${expected.name} (${expected.category})`,
      () => {
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const dom = new JSDOM(html);
        const body = dom.window.document.body;

        const structure = extractStructure(body);
        const interactiveElements = collectInteractive(structure);

        console.log(`\n=== ${expected.name} (${expected.description}) ===`);
        console.log(`HTML大小: ${(html.length / 1024).toFixed(1)}KB`);
        console.log(`交互元素: ${interactiveElements.length}个`);

        if (expected.minInteractive !== undefined) {
          expect(interactiveElements.length).toBeGreaterThanOrEqual(expected.minInteractive);
          console.log(`  ✓ 交互元素 >= ${expected.minInteractive}`);
        }

        if (expected.hasInput) {
          const inputs = interactiveElements.filter(
            (el) => (el.interactive as StructureNode).type === 'input'
          );
          expect(inputs.length).toBeGreaterThan(0);
          console.log(`  ✓ 有输入框: ${inputs.length}个`);
        }

        if (expected.hasLink) {
          const links = interactiveElements.filter(
            (el) => (el.interactive as StructureNode).type === 'link'
          );
          expect(links.length).toBeGreaterThan(0);
          console.log(`  ✓ 有链接: ${links.length}个`);
        }

        if (expected.hasButton) {
          const buttons = interactiveElements.filter(
            (el) => (el.interactive as StructureNode).type === 'button'
          );
          expect(buttons.length).toBeGreaterThan(0);
          console.log(`  ✓ 有按钮: ${buttons.length}个`);
        }

        if (expected.regions) {
          for (const region of expected.regions) {
            expect(hasRegion(structure, region)).toBe(true);
            console.log(`  ✓ 有区域: ${region}`);
          }
        }

        if (expected.hasSearchForm) {
          const searchInputs = interactiveElements.filter((el) => {
            const inter = el.interactive as StructureNode;
            if (inter.type !== 'input') return false;
            const placeholder = ((inter.placeholder as string) || '').toLowerCase();
            const name = ((inter.name as string) || '').toLowerCase();
            const selector = ((inter.selector as string) || '').toLowerCase();
            return (
              placeholder.includes('search') ||
              placeholder.includes('搜索') ||
              placeholder.includes('搜') ||
              name.includes('search') ||
              name.includes('kw') ||
              name.includes('q') ||
              selector.includes('search') ||
              selector.includes('kw')
            );
          });
          expect(searchInputs.length).toBeGreaterThan(0);
          console.log(`  ✓ 有搜索框: ${searchInputs.length}个`);
        }

        if (expected.hasListGrouped) {
          expect(findGrouped(structure)).toBe(true);
          console.log(`  ✓ 有分组元素`);
        }
      }
    );
  }

  it('should generate summary report', () => {
    console.log('\n\n========== 结构提取汇总报告 ==========\n');

    const results: Array<{
      name: string;
      category: string;
      interactiveCount: number;
      hasInput: boolean;
      hasLink: boolean;
      hasButton: boolean;
      regions: string[];
    }> = [];

    for (const expected of websiteExpectations) {
      const htmlPath = path.join(websitesDir, `${expected.name}.html`);
      if (!fs.existsSync(htmlPath)) continue;

      const html = fs.readFileSync(htmlPath, 'utf-8');
      const dom = new JSDOM(html);
      const body = dom.window.document.body;

      const structure = extractStructure(body);
      const interactiveElements = collectInteractive(structure);

      const inputs = interactiveElements.filter(
        (el) => (el.interactive as StructureNode).type === 'input'
      );
      const links = interactiveElements.filter(
        (el) => (el.interactive as StructureNode).type === 'link'
      );
      const buttons = interactiveElements.filter(
        (el) => (el.interactive as StructureNode).type === 'button'
      );

      const regions: string[] = [];
      const regionTypes = [
        'navigation',
        'header',
        'footer',
        'main',
        'sidebar',
        'form',
        'section',
        'list',
      ];
      for (const region of regionTypes) {
        if (hasRegion(structure, region)) regions.push(region);
      }

      results.push({
        name: expected.name,
        category: expected.category,
        interactiveCount: interactiveElements.length,
        hasInput: inputs.length > 0,
        hasLink: links.length > 0,
        hasButton: buttons.length > 0,
        regions,
      });
    }

    const categories = [...new Set(results.map((r) => r.category))];
    for (const cat of categories) {
      console.log(`\n【${cat}】`);
      const catResults = results.filter((r) => r.category === cat);
      for (const r of catResults) {
        const icons = [];
        if (r.hasInput) icons.push('📝');
        if (r.hasLink) icons.push('🔗');
        if (r.hasButton) icons.push('🔘');
        console.log(
          `  ${r.name}: ${r.interactiveCount}个交互元素 ${icons.join(' ')} [${r.regions.join(', ')}]`
        );
      }
    }

    console.log('\n========================================');
    console.log(`总计: ${results.length} 个网站`);
    console.log(`有输入框: ${results.filter((r) => r.hasInput).length} 个`);
    console.log(`有链接: ${results.filter((r) => r.hasLink).length} 个`);
    console.log(`有按钮: ${results.filter((r) => r.hasButton).length} 个`);
    console.log('========================================\n');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should show example structure output for github', () => {
    const htmlPath = path.join(websitesDir, 'github.html');
    if (!fs.existsSync(htmlPath)) {
      console.log('github.html 不存在，跳过');
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    const body = dom.window.document.body;

    const structure = extractStructure(body);

    console.log('\n========== GitHub 结构示例 ==========\n');
    console.log(structureToYaml(structure));
    console.log('==========================================\n');

    expect(structure).toBeDefined();
  });
});
