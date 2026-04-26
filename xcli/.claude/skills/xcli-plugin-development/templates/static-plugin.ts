import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { ok, fail } from 'xcli';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'static-example',
    url: 'https://example.com', // TODO: 替换为实际 URL
  });

  site.command('scrape', {
    description: '采集静态页面数据',

    // Zod schema 定义入参，同时提供运行时校验和类型推断
    parameters: z.object({
      keyword: z.string().describe('搜索关键词'),
      limit: z.number().default(10).describe('最大条数'),
    }),

    async handler(params, ctx) {
      if (!ctx.page) {
        return fail('静态采集需要浏览器页面');
      }

      // TODO: 替换为实际搜索 URL
      await ctx.page.goto(`https://example.com/search?q=${encodeURIComponent(params.keyword)}`);

      // 等待内容加载完成（静态页面通常不需要 waitForSelector，但保险起见）
      await ctx.page.waitForSelector('.result-item');

      // 提取数据
      const items = await ctx.page.evaluate((limit) => {
        const elements = Array.from(document.querySelectorAll('.result-item')); // TODO: 替换选择器
        return elements.slice(0, limit).map((el) => ({
          title: (el.querySelector('.title') as HTMLElement)?.textContent?.trim() ?? '',
          url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
          description: (el.querySelector('.desc') as HTMLElement)?.textContent?.trim() ?? '',
        }));
      }, params.limit);

      if (items.length === 0) {
        return fail('未找到结果', ['请检查选择器或关键词']);
      }

      return ok(items);
    },
  });
}
