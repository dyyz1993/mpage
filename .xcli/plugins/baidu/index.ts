import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const baidu = xcli.createSite({
    name: 'baidu',
    url: 'https://www.baidu.com',
    description: '百度搜索',
    requiresLogin: false,
  });

  baidu.command('search', {
    description: '百度搜索',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      limit: z.number().optional().default(10).describe('结果数量'),
    }),
    requiresLogin: false,
    examples: [
      { cmd: 'xcli baidu search --query "AI"', description: '搜索 AI 相关内容' },
      { cmd: 'xcli baidu search --query "AI" --limit 5', description: '只返回 5 条结果' },
    ],
    tips: ['💡 使用 --query 指定搜索词'],
    handler: async (params, _ctx) => {
      const { query, limit } = params;
      return {
        ok: true,
        query,
        limit,
        results: [
          {
            title: `${query} - 百度搜索结果1`,
            url: 'https://example.com/1',
            snippet: '这是搜索结果摘要...',
          },
          {
            title: `${query} - 百度搜索结果2`,
            url: 'https://example.com/2',
            snippet: '这是搜索结果摘要...',
          },
        ].slice(0, limit),
      };
    },
  });

  baidu.command('hotsearch', {
    description: '获取百度热搜榜',
    parameters: z.object({}),
    requiresLogin: false,
    examples: [{ cmd: 'xcli baidu hotsearch', description: '获取热搜榜单' }],
    handler: async (_params, _ctx) => {
      return {
        ok: true,
        items: [
          { rank: 1, title: '热搜话题1', url: 'https://example.com/1', heat: '500万' },
          { rank: 2, title: '热搜话题2', url: 'https://example.com/2', heat: '300万' },
          { rank: 3, title: '热搜话题3', url: 'https://example.com/3', heat: '200万' },
        ],
      };
    },
  });

  baidu.login(async (ctx) => {
    console.log('百度登录中...');
    await ctx.storage.set('baidu_token', { loggedIn: true, at: Date.now() });
  });

  baidu.logout(async (ctx) => {
    await ctx.storage.delete('baidu_token');
  });
}
