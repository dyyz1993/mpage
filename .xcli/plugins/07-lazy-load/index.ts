import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const newsSchema = z.object({
  title: z.string().describe('新闻标题'),
  source: z.string().describe('新闻来源'),
  time: z.string().describe('发布时间'),
  views: z.number().int().nonnegative().describe('阅读数'),
});

const resultSchema = z.object({
  total: z.number().int().nonnegative().describe('总采集数量'),
  clicks: z.number().int().nonnegative().describe('点击次数'),
  news: z.array(newsSchema).describe('新闻列表'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '07-lazy-load',
    url: '',
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '通过fetch API采集懒加载新闻数据',
    parameters: z.object({
      base_url: z.string().url().describe('目标URL'),
      limit: z.number().int().positive().default(10).describe('每次加载数量'),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 07-lazy-load scrape --base_url "https://..."',
        output: `data:
  total: 50
  clicks: 5
  news:
    - title: "苹果发布M3芯片：性能提升30%"
      source: "科技日报"
      time: "2小时前"
      views: 3456
    - ...
💡 采集完成，共 5 次 50 条数据`,
      },
    ],
    handler: async (params, ctx) => {
      const allNews: z.infer<typeof newsSchema>[] = [];
      let offset = 0;
      let hasMore = true;
      let clicks = 0;
      const limit = params.limit ?? 10;

      while (hasMore) {
        await ctx.page.goto(params.base_url);
        await ctx.page.waitForSelector('.simulation-area');

        const fetchParams = { off: offset, lim: limit };
        const response = await ctx.page.evaluate((args) => {
          return fetch('/tools/crawler-practice/examples/07/load-more', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offset: args.off, limit: args.lim }),
          }).then((r) => r.json());
        }, fetchParams);

        if (!response || !response.success || !response.data) {
          break;
        }

        for (const item of response.data) {
          allNews.push({
            title: item.title || '',
            source: item.source || '',
            time: item.time || '',
            views: typeof item.views === 'number' ? item.views : 0,
          });
        }

        hasMore = response.hasMore === true;
        offset = response.offset || offset + limit;
        clicks++;

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return {
        data: {
          total: allNews.length,
          clicks,
          news: allNews,
        },
        tips: [`采集完成，共 ${clicks} 次 ${allNews.length} 条数据`],
      };
    },
  });

  plugin.command('scrape-by-click', {
    description: '通过点击加载更多按钮采集新闻数据',
    parameters: z.object({
      base_url: z.string().url().describe('目标URL'),
      max_clicks: z.number().int().positive().optional().default(10).describe('最大点击次数'),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 07-lazy-load scrape-by-click --base_url "https://..."',
        output: `data:
  total: 50
  clicks: 5
  news:
    - title: "苹果发布M3芯片：性能提升30%"
      source: "科技日报"
      time: "2小时前"
      views: 3456
    - ...
💡 点击 5 次，共采集 50 条数据`,
      },
    ],
    handler: async (params, ctx) => {
      let clicks = 0;
      const maxClicks = params.max_clicks ?? 10;

      await ctx.page.goto(params.base_url);
      await ctx.page.waitForSelector('.simulation-area');

      let hasMore = true;
      while (hasMore && clicks < maxClicks) {
        const btn = ctx.page.locator('.load-more-btn');
        const count = await btn.count();

        if (count === 0) {
          break;
        }

        const isDisabled = await btn.isDisabled().catch(() => true);
        if (isDisabled) {
          break;
        }

        await btn.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        clicks++;
      }

      const allNews = await ctx.page.evaluate(() => {
        const items = document.querySelectorAll('.news-item');
        return Array.from(items).map((item) => {
          const title = item.querySelector('.news-item-title')?.textContent?.trim() || '';
          const source = item.querySelector('.news-item-source')?.textContent?.trim() || '';
          const metaSpans = item.querySelectorAll('.news-item-meta span');
          let time = '';
          let views = 0;
          metaSpans.forEach((span) => {
            const text = span.textContent || '';
            if (text.includes('📅')) {
              time = text.replace('📅', '').trim();
            } else if (text.includes('👁️')) {
              views = parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
            }
          });
          return { title, source, time, views };
        });
      });

      return {
        data: {
          total: allNews.length,
          clicks,
          news: allNews,
        },
        tips: [`点击 ${clicks} 次，共采集 ${allNews.length} 条数据`],
      };
    },
  });
}
