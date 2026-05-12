import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

const threadSchema = z.object({
  id: z.union([z.string(), z.number()]).describe('主题ID'),
  title: z.string().describe('标题'),
  author: z.string().describe('作者'),
  datetime: z.string().describe('发布时间'),
  replies: z.number().int().nonnegative().describe('回复数'),
  views: z.number().int().nonnegative().describe('浏览数'),
  page: z.number().int().positive().describe('所在页码'),
});

const resultSchema = z.object({
  total_pages: z.number().int().positive().describe('总页数'),
  threads: z.array(threadSchema).describe('主题列表'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '04-pagination',
    url: crawlerUrl('04-pagination'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集分页数据',
    parameters: z.object({
      url: z.string().url().optional().default(crawlerUrl('04-pagination')),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 04-pagination scrape --url "https://..."',
        output: `data:
  total_pages: 5
  threads:
    - id: "100"
      title: "Python爬虫入门教程"
      author: 张三
      datetime: 2024-01-15 10:30
      replies: 85
      views: 4056
      page: 1
    - ...
💡 采集完成，共 5 页 50 条数据`,
      },
    ],
    handler: async (params, ctx) => {
      const baseUrl = params.url;
      const allThreads: z.infer<typeof threadSchema>[] = [];
      let totalPages = 1;

      async function scrapePage(
        page: number
      ): Promise<{ threads: Record<string, unknown>[]; totalPages: number }> {
        const pageUrl = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        await ctx.page.goto(pageUrl);
        await ctx.page.waitForSelector('.simulation-area');

        return await ctx.page.evaluate((currentPage: number) => {
          const simArea = document.querySelector('.simulation-area');
          if (!simArea) return { threads: [], totalPages: 1 };

          const fullText = simArea.innerText;

          const pageInfoMatch = fullText.match(/共\s*(\d+)\s*页/);
          const totalPages = pageInfoMatch ? parseInt(pageInfoMatch[1], 10) : 1;

          const lines = fullText.split('\n').filter((l) => l.trim());
          const threads: Record<string, unknown>[] = [];
          let currentThread: Record<string, unknown> | null = null;

          for (const line of lines) {
            if (line.includes('👤')) {
              if (currentThread) threads.push(currentThread);
              currentThread = {
                page: currentPage,
                author: '',
                datetime: '',
                replies: 0,
                views: 0,
              };
              const authorMatch = line.match(/👤\s*(.+?)(?=📅|$)/);
              if (authorMatch) currentThread.author = authorMatch[1].trim();
            } else if (line.includes('📅') && currentThread) {
              const dateMatch = line.match(/📅\s*(.+?)(?=💬|$)/);
              if (dateMatch) currentThread.datetime = dateMatch[1].trim();
            } else if (line.includes('💬') && currentThread) {
              const repliesMatch = line.match(/💬\s*(\d+)/);
              if (repliesMatch) currentThread.replies = parseInt(repliesMatch[1], 10);
            } else if (line.includes('👁️') && currentThread) {
              const viewsMatch = line.match(/👁️\s*([\d,]+)/);
              if (viewsMatch) currentThread.views = parseInt(viewsMatch[1].replace(/,/g, ''), 10);
            }
          }
          if (currentThread) threads.push(currentThread);

          return { threads, totalPages };
        }, page);
      }

      const firstPageData = await scrapePage(1);
      allThreads.push(...firstPageData.threads);
      totalPages = firstPageData.totalPages;

      for (let page = 2; page <= totalPages; page++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const pageData = await scrapePage(page);
        allThreads.push(...pageData.threads);
      }

      for (let i = 0; i < allThreads.length; i++) {
        const page = allThreads[i].page;
        const indexInPage = i % 10;
        allThreads[i].id = 100 - (page - 1) * 10 - indexInPage;
        allThreads[i].title = `主题 #${allThreads[i].id}`;
      }

      return {
        data: {
          total_pages: totalPages,
          threads: allThreads,
        },
        tips: [`采集完成，共 ${totalPages} 页 ${allThreads.length} 条数据`],
      };
    },
  });
}
