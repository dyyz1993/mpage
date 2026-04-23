import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const doubao = xcli.createSite({
    name: 'doubao',
    url: 'https://doubao.com',
    description: '豆包 AI 助手',
    requiresLogin: false,
  });

  const ListParams = z.object({
    scope: z.string().optional().default('all').describe('话题范围'),
    limit: z.number().optional().default(10).describe('返回数量 (1-100)'),
  });

  const ListResult = z.object({
    ok: z.boolean(),
    scope: z.string(),
    total: z.number(),
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        count: z.number(),
      })
    ),
  });

  doubao.command('list', {
    description: '列出豆包话题分类',
    parameters: ListParams,
    result: ListResult,
    requiresLogin: false,
    examples: [
      { cmd: 'xcli doubao list', description: '列出所有话题' },
      { cmd: 'xcli doubao list --scope tech', description: '指定话题范围' },
      { cmd: 'xcli doubao list --limit 20', description: '返回 20 条' },
    ],
    tips: ['💡 使用 --scope 指定范围可以获得更精确的结果'],
    handler: async (params, _ctx) => {
      const { scope, limit } = params;
      const items = [
        { id: 1, name: '科技', count: 42 },
        { id: 2, name: '娱乐', count: 38 },
        { id: 3, name: '财经', count: 25 },
        { id: 4, name: '体育', count: 31 },
        { id: 5, name: '教育', count: 18 },
      ].slice(0, limit);

      return { ok: true, scope, total: items.length, items };
    },
  });

  const InputParams = z.object({
    text: z.string().describe('输入内容'),
  });

  const InputResult = z.object({
    ok: z.boolean(),
    reply: z.string(),
    timestamp: z.number(),
  });

  doubao.command('input', {
    description: '与豆包对话',
    parameters: InputParams,
    result: InputResult,
    requiresLogin: false,
    examples: [{ cmd: 'xcli doubao input --text "你好"', description: '发送对话' }],
    tips: ['💡 使用 --text 或 -t 指定输入内容'],
    handler: async (params, _ctx) => {
      return {
        ok: true,
        reply: `豆包回复: ${params.text}`,
        timestamp: Date.now(),
      };
    },
  });

  const SearchParams = z.object({
    query: z.string().describe('搜索关键词'),
    tags: z.array(z.string()).optional().describe('标签筛选'),
    limit: z.number().optional().default(10).describe('返回数量'),
  });

  const SearchResult = z.object({
    ok: z.boolean(),
    query: z.string(),
    total: z.number(),
    items: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        tags: z.array(z.string()),
      })
    ),
  });

  doubao.command('search', {
    description: '搜索豆包内容',
    parameters: SearchParams,
    result: SearchResult,
    requiresLogin: false,
    examples: [
      { cmd: 'xcli doubao search --query AI', description: '搜索 AI 相关' },
      { cmd: 'xcli doubao search --query machine --tags tech,ai', description: '带标签搜索' },
    ],
    tips: ['💡 使用 --tags 筛选标签'],
    handler: async (params, _ctx) => {
      const { query, tags, limit } = params;
      const items = [
        { id: 1, title: `关于 "${query}" 的文章 1`, tags: tags || [] },
        { id: 2, title: `关于 "${query}" 的文章 2`, tags: tags || [] },
        { id: 3, title: `关于 "${query}" 的文章 3`, tags: tags || [] },
      ].slice(0, limit);

      return { ok: true, query, total: items.length, items };
    },
  });

  doubao.login(async (ctx) => {
    console.log('豆包登录中...');
    await ctx.storage.set('doubao_token', { loggedIn: true, at: Date.now() });
  });

  doubao.logout(async (ctx) => {
    await ctx.storage.delete('doubao_token');
  });
}
