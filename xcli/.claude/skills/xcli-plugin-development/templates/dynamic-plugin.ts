import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'dynamic-example',
    url: 'https://example.com', // TODO: 替换为实际 URL
  });

  site.command('scrape', {
    description: '采集动态页面数据（分页、懒加载）',

    input: z.object({
      keyword: z.string().describe('搜索关键词'),
      limit: z.number().default(30).describe('最大条数'),
      page: z.number().default(1).describe('起始页码'),
      maxPages: z.number().default(5).describe('最大翻页数'),
    }),

    async handler(params, ctx) {
      if (!ctx.page) {
        return { data: [], tips: ['动态采集需要浏览器页面'] };
      }

      const allItems: Array<Record<string, string>> = [];
      let currentPage = params.page;

      while (currentPage <= params.page + params.maxPages - 1 && allItems.length < params.limit) {
        // TODO: 替换为实际列表页 URL（含分页参数）
        const url = `https://example.com/search?q=${encodeURIComponent(params.keyword)}&page=${currentPage}`;
        await ctx.page.goto(url);

        // 动态页面必须等关键元素渲染完成
        await ctx.page.waitForSelector('.result-item', { timeout: 10000 }); // TODO: 替换选择器

        // 在浏览器上下文中提取数据，避免跨域和序列化问题
        const remaining = params.limit - allItems.length;
        const items = await ctx.page.evaluate((limit) => {
          const elements = Array.from(document.querySelectorAll('.result-item')); // TODO: 替换选择器
          return elements.slice(0, limit).map((el) => ({
            title: (el.querySelector('.title') as HTMLElement)?.textContent?.trim() ?? '',
            url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
            price: (el.querySelector('.price') as HTMLElement)?.textContent?.trim() ?? '',
          }));
        }, remaining);

        allItems.push(...items);

        // 没有更多数据，提前退出
        if (items.length === 0) break;

        currentPage++;
      }

      return {
        data: allItems.slice(0, params.limit),
        tips: [
          `共采集 ${allItems.length} 条，翻页 ${currentPage - params.page} 页`,
          ...(allItems.length === 0 ? ['未找到结果，请检查选择器或关键词'] : []),
        ],
      };
    },
  });
}
