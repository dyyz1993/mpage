import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

const articleSchema = z.object({
  title: z.string().describe('文章标题'),
  url: z.string().describe('文章链接'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('发布日期'),
  author: z.string().describe('作者'),
  views: z.number().int().nonnegative().describe('阅读数'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '01-static',
    url: crawlerUrl('01-static'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集静态HTML页面数据',
    parameters: z.object({}),
    result: z.object({
      data: z.array(articleSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 01-static scrape',
        output: `data:
  - title: "Python爬虫入门指南（一）：初识爬虫"
    url: /blog/post/python-crawler-getting-started
    date: 2024-01-15
    author: 张三
    views: 1234
tips:
  - "采集到 5 篇文章"`,
      },
      {
        cmd: 'xcli 01-static scrape --json',
        output: `{
  "data": [
    { "title": "Python爬虫入门指南（一）：初识爬虫", "url": "/blog/post/...", "date": "2024-01-15", "author": "张三", "views": 1234 }
  ],
  "tips": ["采集到 5 篇文章"]
}`,
      },
    ],
    handler: async (_params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html'
      );
      await ctx.page.waitForSelector('h2');
      const articles = await ctx.page.evaluate(() => {
        const results: Array<{
          title: string;
          url: string;
          date: string;
          author: string;
          views: number;
        }> = [];
        const headings = document.querySelectorAll('h2');
        headings.forEach((h2) => {
          const title = h2.textContent?.trim() || '';
          const parent = h2.parentElement;
          if (!parent) return;

          const dateEl = parent.querySelector('span:first-child');
          const authorEl = parent.querySelectorAll('span')[1];
          const viewsEl = parent.querySelectorAll('span')[2];

          const dateMatch = dateEl?.textContent?.match(/\d{4}-\d{2}-\d{2}/);
          const viewsMatch = viewsEl?.textContent?.replace(/[^\d]/g, '');

          results.push({
            title,
            url: h2.querySelector('a')?.getAttribute('href') || '',
            date: dateMatch?.[0] || '',
            author: authorEl?.textContent?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || '',
            views: parseInt(viewsMatch || '0', 10),
          });
        });
        return results;
      });
      return {
        data: articles,
        tips: [`采集到 ${articles.length} 篇文章`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验采集数据',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(articleSchema),
      errors: z.array(z.object({ field: z.string(), expected: z.string(), actual: z.string() })),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 01-static verify',
        output: `status: pass
data:
  - title: "Python爬虫入门指南（一）：初识爬虫"
    url: /blog/post/python-crawler-getting-started
    date: 2024-01-15
    author: 张三
    views: 1234
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html'
      );
      await ctx.page.waitForSelector('h2');
      const data = await ctx.page.evaluate(() => {
        const results: Array<{
          title: string;
          url: string;
          date: string;
          author: string;
          views: number;
        }> = [];
        const headings = document.querySelectorAll('h2');
        headings.forEach((h2) => {
          const title = h2.textContent?.trim() || '';
          const parent = h2.parentElement;
          if (!parent) return;

          const dateEl = parent.querySelector('span:first-child');
          const authorEl = parent.querySelectorAll('span')[1];
          const viewsEl = parent.querySelectorAll('span')[2];

          const dateMatch = dateEl?.textContent?.match(/\d{4}-\d{2}-\d{2}/);
          const viewsMatch = viewsEl?.textContent?.replace(/[^\d]/g, '');

          results.push({
            title,
            url: h2.querySelector('a')?.getAttribute('href') || '',
            date: dateMatch?.[0] || '',
            author: authorEl?.textContent?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || '',
            views: parseInt(viewsMatch || '0', 10),
          });
        });
        return results;
      });

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!Array.isArray(data))
        errors.push({ field: 'data', expected: 'array', actual: typeof data });
      if (data.length !== 5)
        errors.push({ field: 'length', expected: '5', actual: String(data.length) });

      data.forEach((item, i) => {
        if (!item.title || typeof item.title !== 'string')
          errors.push({ field: `[${i}].title`, expected: 'string', actual: String(item.title) });
        if (!item.url || typeof item.url !== 'string')
          errors.push({ field: `[${i}].url`, expected: 'string', actual: String(item.url) });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date))
          errors.push({ field: `[${i}].date`, expected: 'YYYY-MM-DD', actual: String(item.date) });
        if (!item.author || typeof item.author !== 'string')
          errors.push({ field: `[${i}].author`, expected: 'string', actual: String(item.author) });
        if (typeof item.views !== 'number' || !Number.isInteger(item.views))
          errors.push({ field: `[${i}].views`, expected: 'integer', actual: String(item.views) });
      });

      const first = data[0] as any;
      if (first && !first.title.includes('Python爬虫入门指南'))
        errors.push({
          field: '[0].title',
          expected: 'contains "Python爬虫入门指南"',
          actual: first?.title || 'undefined',
        });
      if (first && first.author !== '张三')
        errors.push({
          field: '[0].author',
          expected: '张三',
          actual: first?.author || 'undefined',
        });
      if (first && first.date !== '2024-01-15')
        errors.push({
          field: '[0].date',
          expected: '2024-01-15',
          actual: first?.date || 'undefined',
        });
      if (first && first.views !== 1234)
        errors.push({ field: '[0].views', expected: '1234', actual: String(first?.views) });

      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips = status === 'pass' ? ['校验通过'] : [`发现 ${errors.length} 个问题`];

      return { status, data, errors, tips };
    },
  });
}
