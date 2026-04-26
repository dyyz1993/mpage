import { z } from 'zod';

// ── 请求/响应类型定义 ──────────────────────────────────
// 纯 API 插件不依赖 ctx.page，直接用 fetch 调用接口

interface SearchRequest {
  keyword: string;
  page: number;
  pageSize: number;
}

interface SearchResponse {
  code: number;
  data: {
    total: number;
    list: Array<{
      id: string;
      title: string;
      url: string;
      createdAt: string;
    }>;
  };
  message: string;
}

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'api-example',
    url: 'https://api.example.com', // TODO: 替换为实际 API 地址
  });

  site.command('fetch', {
    description: '通过 API 获取数据（纯接口，不需要浏览器）',

    parameters: z.object({
      keyword: z.string().describe('搜索关键词'),
      limit: z.number().default(20).describe('最大条数'),
      page: z.number().default(1).describe('页码'),
    }),

    async handler(params, ctx) {
      // API 插件从 storage 获取 token（由 login 命令写入）
      const token = (await ctx.storage.get('api_token')) as string | undefined;

      const requestBody: SearchRequest = {
        keyword: params.keyword,
        page: params.page,
        pageSize: params.limit,
      };

      // TODO: 替换为实际 API 端点
      const response = await fetch('https://api.example.com/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return {
          data: [],
          tips: [`API 请求失败: ${response.status} ${response.statusText}`],
        };
      }

      const result = (await response.json()) as SearchResponse;

      if (result.code !== 0) {
        return {
          data: [],
          tips: [`接口返回错误: ${result.message}`],
        };
      }

      const items = result.data.list.map((item) => ({
        title: item.title,
        url: item.url,
        createdAt: item.createdAt,
      }));

      return {
        data: items,
        tips: [
          `共 ${result.data.total} 条，当前返回 ${items.length} 条`,
          ...(items.length === 0 ? ['未找到结果，请检查关键词'] : []),
        ],
      };
    },
  });

  // ── API 登录（获取 token）──────────────────────────────
  site.command('login', {
    description: '通过 API 登录获取 token',

    parameters: z.object({
      username: z.string().describe('用户名'),
      password: z.string().describe('密码'),
    }),

    async handler(params, ctx) {
      // TODO: 替换为实际登录接口
      const response = await fetch('https://api.example.com/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: params.username, password: params.password }),
      });

      if (!response.ok) {
        return { data: null, tips: [`登录失败: ${response.status}`] };
      }

      const result = (await response.json()) as { code: number; data: { token: string } };

      if (result.code !== 0) {
        return { data: null, tips: ['登录失败，请检查账号密码'] };
      }

      // 持久化 token 到 storage
      await ctx.storage.set('api_token', result.data.token);

      return {
        data: { tokenSaved: true },
        tips: ['登录成功，token 已保存'],
      };
    },
  });
}
