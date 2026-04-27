import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  source: z.string().optional(),
  page: z.number(),
  position: z.number(),
});

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'web-automation',
    url: '',
    description: '通用网页自动化 - 搜索、提取、分页采集',
    requiresLogin: false,
  });

  site.command('baidu-search', {
    description: '百度搜索并提取多页结果',
    scope: 'browser',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      pages: z.number().optional().default(1).describe('采集页数，默认1页'),
    }),
    examples: [
      { cmd: 'xcli web-automation baidu-search --query "编程"', description: '搜索"编程"' },
      {
        cmd: 'xcli web-automation baidu-search --query "AI" --pages 3',
        description: '搜索"AI"并采集前3页',
      },
    ],
    handler: async (params, ctx) => {
      const { query, pages } = params;
      const allResults: z.infer<typeof SearchResultSchema>[] = [];

      await ctx.page.goto(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`);
      await ctx.page.waitForLoadState('domcontentloaded');

      for (let pageNum = 1; pageNum <= pages; pageNum++) {
        if (pageNum > 1) {
          const nextBtn = ctx.page.locator('.n');
          await nextBtn.click();
          await ctx.page.waitForLoadState('domcontentloaded');
          await ctx.page.waitForTimeout(1000);
        }

        const pageResults = await ctx.page.evaluate((pNum: number) => {
          const results: Array<{
            title: string;
            url: string;
            snippet: string;
            source: string;
            page: number;
            position: number;
          }> = [];

          const containers = document.querySelectorAll('.result, .c-container');
          containers.forEach((container, idx) => {
            const titleEl = container.querySelector('h3 a, .t a');
            const snippetEl = container.querySelector(
              '.c-abstract, [class*="abstract"], .c-span-last .content-right_8Zs40'
            );
            const sourceEl = container.querySelector(
              '.c-showurl, [class*="showurl"], .c-color-gray'
            );

            const title = titleEl?.textContent?.trim() || '';
            const url = titleEl?.getAttribute('href') || '';
            const snippet = snippetEl?.textContent?.trim() || '';
            const source = sourceEl?.textContent?.trim() || '';

            if (title) {
              results.push({
                title,
                url,
                snippet: snippet.slice(0, 300),
                source,
                page: pNum,
                position: idx + 1,
              });
            }
          });

          return results;
        }, pageNum);

        allResults.push(...pageResults);
      }

      return {
        data: allResults,
        tips: [`关键词: "${query}"`, `采集 ${pages} 页，共 ${allResults.length} 条结果`],
      };
    },
  });

  site.command('extract', {
    description: '从指定URL提取页面结构化内容',
    scope: 'browser',
    parameters: z.object({
      url: z.string().describe('目标页面URL'),
      selector: z.string().optional().default('body').describe('CSS选择器，默认body'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('字段名'),
            selector: z.string().describe('CSS选择器'),
            attribute: z.string().optional().describe('提取属性值(如href)，留空则取textContent'),
          })
        )
        .optional()
        .describe('自定义提取字段列表'),
    }),
    examples: [
      {
        cmd: 'xcli web-automation extract --url "https://news.ycombinator.com" --fields \'[{"name":"title","selector":".titleline > a"},{"name":"link","selector":".titleline > a","attribute":"href"}]\'',
        description: '提取 Hacker News 标题和链接',
      },
    ],
    handler: async (params, ctx) => {
      const { url, selector, fields } = params;

      await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ctx.page.waitForLoadState('networkidle');

      if (fields && fields.length > 0) {
        const data = await ctx.page.evaluate((fieldDefs: typeof fields) => {
          return fieldDefs.map((field) => {
            const elements = document.querySelectorAll(field.selector);
            return {
              field: field.name,
              values: Array.from(elements).map((el) => {
                if (field.attribute) {
                  return el.getAttribute(field.attribute) || '';
                }
                return el.textContent?.trim() || '';
              }),
            };
          });
        }, fields);

        return {
          data,
          tips: [`从 ${url} 提取了 ${fields.length} 个字段`],
        };
      }

      const content = await ctx.page.evaluate((sel: string) => {
        const root = document.querySelector(sel) || document.body;
        const items: Array<{ tag: string; text: string; href?: string; src?: string }> = [];

        const walk = (el: Element) => {
          const tag = el.tagName.toLowerCase();
          const text = el.textContent?.trim().slice(0, 500) || '';
          const item: (typeof items)[0] = { tag, text };

          if (tag === 'a') item.href = (el as HTMLAnchorElement).href;
          if (tag === 'img') item.src = (el as HTMLImageElement).src;

          if (text && !['script', 'style', 'noscript'].includes(tag)) {
            items.push(item);
          }
        };

        root.querySelectorAll('*').forEach(walk);
        return items;
      }, selector);

      return {
        data: content,
        tips: [`从 ${url} 的 "${selector}" 中提取了 ${content.length} 个元素`],
      };
    },
  });

  site.command('paginate', {
    description: '分页采集：自动翻页并提取数据',
    scope: 'browser',
    parameters: z.object({
      url: z.string().describe('起始页URL'),
      nextSelector: z.string().default('.n, .next, [rel="next"]').describe('下一页按钮选择器'),
      itemSelector: z.string().describe('每条数据的容器选择器'),
      fields: z
        .array(
          z.object({
            name: z.string(),
            selector: z.string(),
            attribute: z.string().optional(),
          })
        )
        .describe('要提取的字段'),
      maxPages: z.number().optional().default(5).describe('最大翻页数'),
      delay: z.number().optional().default(1000).describe('翻页间隔(ms)'),
    }),
    examples: [
      {
        cmd: 'xcli web-automation paginate --url "https://example.com/list" --item-selector ".item" --fields \'[{"name":"title","selector":"h3"}]\' --max-pages 3',
        description: '翻页采集3页数据',
      },
    ],
    handler: async (params, ctx) => {
      const { url, nextSelector, itemSelector, fields, maxPages, delay } = params;
      const allData: Record<string, string>[] = [];

      await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      for (let page = 1; page <= maxPages; page++) {
        const pageData = await ctx.page.evaluate(
          (opts: { itemSel: string; fieldDefs: typeof fields }) => {
            const items = document.querySelectorAll(opts.itemSel);
            return Array.from(items).map((item) => {
              const row: Record<string, string> = {};
              for (const field of opts.fieldDefs) {
                const el = item.querySelector(field.selector);
                if (el) {
                  row[field.name] = field.attribute
                    ? el.getAttribute(field.attribute) || ''
                    : el.textContent?.trim() || '';
                } else {
                  row[field.name] = '';
                }
              }
              return row;
            });
          },
          { itemSel: itemSelector, fieldDefs: fields }
        );

        allData.push(...pageData);

        if (page < maxPages) {
          const nextBtn = ctx.page.locator(nextSelector).first();
          const isVisible = await nextBtn.isVisible().catch(() => false);
          if (!isVisible) break;

          await nextBtn.click();
          await ctx.page.waitForLoadState('domcontentloaded');
          await ctx.page.waitForTimeout(delay);
        }
      }

      return {
        data: allData,
        tips: [
          `采集 ${Math.min(maxPages, Math.ceil(allData.length / 10))} 页，共 ${allData.length} 条数据`,
          `字段: ${fields.map((f) => f.name).join(', ')}`,
        ],
      };
    },
  });

  site.command('fill-and-submit', {
    description: '填写表单并提交',
    scope: 'browser',
    parameters: z.object({
      url: z.string().describe('表单页面URL'),
      fields: z
        .array(
          z.object({
            selector: z.string().describe('输入框选择器'),
            value: z.string().describe('填入值'),
          })
        )
        .describe('表单字段列表'),
      submitSelector: z
        .string()
        .default('button[type="submit"], input[type="submit"]')
        .describe('提交按钮选择器'),
      waitForNavigation: z.boolean().optional().default(true).describe('是否等待页面跳转'),
    }),
    examples: [
      {
        cmd: 'xcli web-automation fill-and-submit --url "https://example.com/form" --fields \'[{"selector":"#name","value":"John"},{"selector":"#email","value":"john@test.com"}]\' --submit-selector "#submit"',
        description: '填写并提交表单',
      },
    ],
    handler: async (params, ctx) => {
      const { url, fields: formFields, submitSelector, waitForNavigation } = params;

      await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ctx.page.waitForLoadState('networkidle');

      for (const field of formFields) {
        await ctx.page.fill(field.selector, field.value);
      }

      if (waitForNavigation) {
        await Promise.all([
          ctx.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
          ctx.page.click(submitSelector),
        ]);
      } else {
        await ctx.page.click(submitSelector);
      }

      await ctx.page.waitForLoadState('networkidle');

      const resultUrl = ctx.page.url();
      const resultTitle = await ctx.page.title();

      return {
        data: {
          submittedUrl: url,
          resultUrl,
          resultTitle,
          fieldsFilled: formFields.length,
        },
        tips: [`表单已提交，跳转到: ${resultUrl}`],
      };
    },
  });

  site.command('screenshot', {
    description: '截取网页截图',
    scope: 'browser',
    parameters: z.object({
      url: z.string().describe('目标URL'),
      fullPage: z.boolean().optional().default(false).describe('是否全页截图'),
      selector: z.string().optional().describe('只截取指定元素'),
    }),
    examples: [
      {
        cmd: 'xcli web-automation screenshot --url "https://example.com" --full-page true',
        description: '全页截图',
      },
    ],
    handler: async (params, ctx) => {
      const { url, fullPage, selector } = params;

      await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ctx.page.waitForLoadState('networkidle');

      let base64: string;

      if (selector) {
        const element = ctx.page.locator(selector);
        const buffer = await element.screenshot();
        base64 = buffer.toString('base64');
      } else {
        const buffer = await ctx.page.screenshot({ fullPage });
        base64 = buffer.toString('base64');
      }

      return {
        data: {
          url,
          fullPage,
          imageBase64: base64,
          size: base64.length,
        },
        tips: [`截图完成，大小 ${(base64.length / 1024).toFixed(1)}KB`],
      };
    },
  });
}
