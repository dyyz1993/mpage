#!/usr/bin/env node

import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  location: string;
  sellerName: string;
  phone?: string;
  publishTime: string;
}

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '34-secondhand-market',
    url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/34-secondhand-market.html',
    requiresLogin: true,
  });

  plugin.command('login', {
    description: '登录二手市场',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
    }),
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/34`;

      const loginRes = await fetchJSON(`${TARGET}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: params.username, password: params.password }),
      });

      if (!loginRes.success) {
        return { success: false, message: loginRes.message };
      }

      await ctx.storage.set('auth_token', loginRes.token);
      return { success: true, message: '登录成功', token: loginRes.token.substring(0, 20) + '...' };
    },
  });

  plugin.command('items', {
    description: '获取商品列表',
    requiresLogin: true,
    parameters: z.object({
      page: z.number().default(1).describe('页码'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/34`;

      const token = await ctx.storage.get('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetchJSON(`${TARGET}/items?page=${params.page}`, { headers });
      return res;
    },
  });

  plugin.command('scrape', {
    description: '采集所有商品（自动遍历全部分页）',
    requiresLogin: true,
    parameters: z.object({}),
    // @ts-ignore
    handler: async (_params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/34`;

      const token = await ctx.storage.get('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const firstPage = await fetchJSON(`${TARGET}/items?page=1`, { headers });
      const { totalItems, hasMore } = firstPage;
      const allItems: Item[] = [...firstPage.items];

      let page = 2;
      while (hasMore) {
        const res = await fetchJSON(`${TARGET}/items?page=${page}`, { headers });
        allItems.push(...res.items);
        if (!res.hasMore) break;
        page++;
      }

      return {
        summary: { totalItems, totalCollected: allItems.length },
        items: allItems,
      };
    },
  });

  plugin.command('reveal-phone', {
    description: '获取商品电话',
    requiresLogin: true,
    parameters: z.object({
      itemId: z.string().describe('商品ID'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/34`;

      const token = await ctx.storage.get('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetchJSON(`${TARGET}/reveal-phone`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId: params.itemId }),
      });

      return res;
    },
  });

  plugin.command('publish', {
    description: '发布商品',
    requiresLogin: true,
    parameters: z.object({
      title: z.string().describe('商品标题'),
      description: z.string().describe('商品描述'),
      price: z.string().describe('商品价格'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/34`;

      const token = await ctx.storage.get('auth_token');

      const formData = new FormData();
      formData.append('title', params.title);
      formData.append('description', params.description);
      formData.append('price', params.price);

      const res = await fetch(`${TARGET}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((r) => r.json());

      return res;
    },
  });
}
