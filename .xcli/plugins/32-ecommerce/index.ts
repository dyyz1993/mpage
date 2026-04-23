import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
const TARGET = `${BASE_URL}/examples/32`;

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '32-ecommerce',
    url: `${BASE_URL}/examples/32-ecommerce-admin.html`,
    requiresLogin: true,
  });

  plugin.command('login', {
    description: '登录电商后台',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      await ctx.page.goto(`${BASE_URL}/examples/32-ecommerce-admin.html?study`, {
        waitUntil: 'domcontentloaded',
      });
      await ctx.page.waitForTimeout(2000);

      await ctx.page.fill('#username', params.username);
      await ctx.page.fill('#password', params.password);

      const captchaText = await ctx.page.locator('.captcha-img').textContent();
      if (captchaText) {
        await ctx.page.fill('#captcha-input', captchaText.trim());
      }

      await ctx.page.click('.login-btn');
      await ctx.page.waitForTimeout(3000);

      const captchaRes = await fetchJSON(`${TARGET}/captcha`);
      const loginRes = await fetchJSON(`${TARGET}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: params.username,
          password: params.password,
          captcha: captchaRes.captcha,
        }),
      });

      if (!loginRes.success) {
        return { success: false, message: loginRes.message };
      }

      await ctx.storage.set('auth_token', loginRes.token);
      return { success: true, message: '登录成功', token: loginRes.token.substring(0, 20) + '...' };
    },
  });

  plugin.command('logout', {
    description: '退出登录',
    requiresLogin: false,
    // @ts-ignore
    handler: async (_params: any, ctx: any) => {
      await ctx.storage.delete('auth_token');
      return { success: true, message: '已退出登录' };
    },
  });

  plugin.command('orders', {
    description: '采集订单列表',
    parameters: z.object({
      page: z.number().optional().default(1).describe('页码'),
      startDate: z.string().optional().describe('开始日期'),
      endDate: z.string().optional().describe('结束日期'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) {
        return { success: false, message: '请先登录' };
      }
      const headers = { Authorization: `Bearer ${token}` };
      let url = `${TARGET}/orders?page=${params.page}`;
      if (params.startDate) url += `&startDate=${params.startDate}`;
      if (params.endDate) url += `&endDate=${params.endDate}`;
      return await fetchJSON(url, { headers });
    },
  });

  plugin.command('scrape', {
    description: '采集所有订单（自动遍历全部分页）',
    parameters: z.object({}),
    // @ts-ignore
    handler: async (_params: any, ctx: any) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) {
        return { success: false, message: '请先登录' };
      }
      const headers = { Authorization: `Bearer ${token}` };

      const firstPage = await fetchJSON(`${TARGET}/orders?page=1`, { headers });
      const { totalOrders, totalPages, orders } = firstPage;

      const allOrders = [...orders];
      for (let page = 2; page <= totalPages; page++) {
        const res = await fetchJSON(`${TARGET}/orders?page=${page}`, { headers });
        allOrders.push(...res.orders);
      }

      return {
        summary: { totalOrders, totalPages, firstOrderId: allOrders[0]?.orderId },
        orders: allOrders,
      };
    },
  });

  plugin.command('export', {
    description: '导出所有订单数据',
    parameters: z.object({}),
    // @ts-ignore
    handler: async (_params: any, ctx: any) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) {
        return { success: false, message: '请先登录' };
      }
      const headers = { Authorization: `Bearer ${token}` };
      return await fetchJSON(`${TARGET}/export`, { headers });
    },
  });

  plugin.command('detail', {
    description: '获取订单详情',
    parameters: z.object({ orderId: z.string().describe('订单号') }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) {
        return { success: false, message: '请先登录' };
      }
      const headers = { Authorization: `Bearer ${token}` };
      return await fetchJSON(`${TARGET}/order/${params.orderId}`, { headers });
    },
  });
}
