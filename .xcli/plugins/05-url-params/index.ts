import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

const productSchema = z.object({
  name: z.string().describe('商品名称'),
  price: z.number().describe('价格'),
  sales: z.number().int().nonnegative().describe('销量'),
  rating: z.string().describe('评分'),
  category: z.string().describe('分类'),
});

const resultSchema = z.object({
  total: z.number().int().nonnegative().describe('总采集数量'),
  products: z.array(productSchema).describe('商品列表'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '05-url-params',
    url: crawlerUrl('05-url-params'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '通过URL参数采集商品数据',
    parameters: z.object({
      base_url: z.string().url().optional().default(crawlerUrl('05-url-params')),
      category: z.string().optional().default('electronics').describe('分类'),
      price_min: z.number().optional().default(0).describe('最低价格'),
      price_max: z.number().optional().default(999999).describe('最高价格'),
      sort: z
        .enum(['sales_desc', 'sales_asc', 'price_desc', 'price_asc'])
        .optional()
        .default('sales_desc')
        .describe('排序方式'),
      pages: z.number().int().positive().optional().default(1).describe('采集页数'),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 05-url-params scrape --base_url "https://..." --category electronics --price_min 500 --price_max 2000 --sort sales_desc --pages 2',
        output: `data:
  total: 20
  products:
    - name: "高性能游戏笔记本"
      price: 1999
      sales: 5000
      rating: "★★★★★"
      category: "电子产品"
    - ...
💡 采集完成，共 2 页 20 条数据`,
      },
    ],
    handler: async (params, ctx) => {
      const allProducts: z.infer<typeof productSchema>[] = [];

      for (let page = 1; page <= params.pages; page++) {
        const url = new URL(params.base_url);
        url.searchParams.set('category', params.category);
        url.searchParams.set('price_min', String(params.price_min));
        url.searchParams.set('price_max', String(params.price_max));
        url.searchParams.set('sort', params.sort);
        url.searchParams.set('page', String(page));

        await ctx.page.goto(url.toString());
        await ctx.page.waitForSelector('.simulation-area');

        const pageProducts = await ctx.page.evaluate(() => {
          const simArea = document.querySelector('.simulation-area');
          if (!simArea) return [];

          const products: any[] = [];
          const lines = simArea.innerText.split('\n').filter((l) => l.trim());

          let currentProduct: any = null;

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.includes('¥')) {
              if (currentProduct) products.push(currentProduct);
              const priceMatch = trimmed.match(/¥([\d,]+)/);
              currentProduct = {
                name: '',
                price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0,
                sales: 0,
                rating: '',
                category: '电子产品',
              };
            } else if (trimmed.includes('销量:') && currentProduct) {
              const salesMatch = trimmed.match(/销量:\s*([\d,]+)/);
              if (salesMatch) currentProduct.sales = parseInt(salesMatch[1].replace(/,/g, ''), 10);
              const ratingMatch = trimmed.match(/评分:\s*(★+☆?)/);
              if (ratingMatch) currentProduct.rating = ratingMatch[1];
            } else if (trimmed.includes('- Model') && !trimmed.includes('¥')) {
              if (currentProduct) {
                currentProduct.name = trimmed;
                products.push(currentProduct);
                currentProduct = null;
              }
            }
          }

          return products;
        });

        allProducts.push(...pageProducts);

        if (page < params.pages) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const filtered = allProducts.filter(
        (p) => p.price >= params.price_min && p.price <= params.price_max
      );

      return {
        data: {
          total: filtered.length,
          products: filtered,
        },
        tips: [`采集完成，共 ${params.pages} 页 ${filtered.length} 条数据`],
      };
    },
  });
}
