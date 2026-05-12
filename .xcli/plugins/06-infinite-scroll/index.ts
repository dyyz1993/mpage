import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

const postSchema = z.object({
  username: z.string().describe('用户名'),
  content: z.string().describe('帖子内容'),
  time: z.string().describe('发布时间'),
  reposts: z.number().int().nonnegative().describe('转发数'),
  comments: z.number().int().nonnegative().describe('评论数'),
  likes: z.number().int().nonnegative().describe('点赞数'),
});

const resultSchema = z.object({
  total: z.number().int().nonnegative().describe('总采集数量'),
  pages: z.number().int().nonnegative().describe('采集页数'),
  posts: z.array(postSchema).describe('帖子列表'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '06-infinite-scroll',
    url: crawlerUrl('06-infinite-scroll'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集无限滚动微博数据',
    parameters: z.object({
      base_url: z.string().url().optional().default(crawlerUrl('06-infinite-scroll')),
      page_size: z.number().int().positive().default(20).describe('每页数量'),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 06-infinite-scroll scrape --base_url "https://..."',
        output: `data:
  total: 60
  pages: 3
  posts:
    - username: "技术博主_A"
      content: "今天学习了Python..."
      time: "2分钟前"
      reposts: 23
      comments: 15
      likes: 128
    - ...
💡 采集完成，共 3 页 60 条数据`,
      },
    ],
    handler: async (params, ctx) => {
      const allPosts: z.infer<typeof postSchema>[] = [];
      let page = 1;
      let hasMore = true;
      let pages = 0;

      const baseUrl = params.base_url.replace('/06-infinite-scroll.html', '/06/infinite-scroll');
      const pageSize = params.page_size ?? 20;

      while (hasMore) {
        const apiUrl = `${baseUrl}?page=${page}&pageSize=${pageSize}`;

        await ctx.page.goto(apiUrl);
        await ctx.page.waitForSelector('body');

        const json = await ctx.page.evaluate(() => {
          try {
            const text = document.body.innerText;
            return JSON.parse(text);
          } catch {
            return null;
          }
        });

        if (!json || !json.success || !json.data) {
          break;
        }

        for (const post of json.data) {
          allPosts.push({
            username: post.username || '',
            content: post.content || '',
            time: post.time || '',
            reposts: typeof post.reposts === 'number' ? post.reposts : 0,
            comments: typeof post.comments === 'number' ? post.comments : 0,
            likes: typeof post.likes === 'number' ? post.likes : 0,
          });
        }

        hasMore = json.hasMore === true;
        pages = json.page || page;
        page++;

        if (hasMore && page > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return {
        data: {
          total: allPosts.length,
          pages,
          posts: allPosts,
        },
        tips: [`采集完成，共 ${pages} 页 ${allPosts.length} 条数据`],
      };
    },
  });
}
