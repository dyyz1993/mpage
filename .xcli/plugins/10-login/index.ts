import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '10-login',
    url: crawlerUrl('10-login'),
    requiresLogin: true,
    isLogin: async (ctx) => {
      const token = await ctx.storage.get('auth_token');
      return token !== null;
    },
  });

  plugin.command('login', {
    description: '登录获取凭证',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10-login.html'
      );
      await ctx.page.waitForLoadState('domcontentloaded');

      const body = JSON.stringify({
        username: params.username,
        password: params.password,
      });

      const response = await ctx.page.evaluate(async (b) => {
        const res = await fetch(
          'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: b,
          }
        );
        return res.json();
      }, body);

      if (response.success) {
        await ctx.storage.set('auth_token', { token: response.token, at: Date.now() });
        console.log('✓ 登录成功');
        console.log(`  Token: ${response.token.substring(0, 20)}...`);
      } else {
        console.log('✗ 登录失败');
        console.log(`  Message: ${response.message}`);
      }

      return {
        data: [
          {
            success: response.success,
            token: response.token,
            message: response.message,
          },
        ],
        tips: response.success ? ['登录成功'] : ['登录失败'],
      };
    },
  });

  plugin.command('scrape', {
    description: '采集登录页面信息',
    requiresLogin: false,
    parameters: z.object({}),
    result: z.object({
      data: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      ),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10-login.html'
      );
      await ctx.page.waitForLoadState('domcontentloaded');

      const data = await ctx.page.evaluate(() => {
        const results: Array<{ title: string; url: string }> = [];
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const url = window.location.href;

        results.push({ title, url });
        return results;
      });

      return {
        data,
        tips: ['请先使用 login 命令登录', `页面: ${data.length > 0 ? data[0].title : '未获取到'}`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验登录凭证',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10-login.html'
      );
      await ctx.page.waitForLoadState('domcontentloaded');

      const body = JSON.stringify({
        username: params.username,
        password: params.password,
      });

      const response = await ctx.page.evaluate(async (b) => {
        const res = await fetch(
          'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: b,
          }
        );
        return res.json();
      }, body);

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!response.success) {
        errors.push({ field: 'success', expected: 'true', actual: 'false' });
      }

      if (!response.token || response.token.length === 0) {
        errors.push({ field: 'token', expected: '非空字符串', actual: String(response.token) });
      }

      if (typeof response.token !== 'string') {
        errors.push({ field: 'token', expected: 'string', actual: typeof response.token });
      }

      return {
        data: [
          {
            success: response.success,
            token: response.token,
            message: response.message,
          },
        ],
        errors,
        tips: errors.length === 0 ? ['校验通过'] : [`发现 ${errors.length} 个问题`],
      };
    },
  });

  plugin.command('status', {
    description: '查看登录状态',
    parameters: z.object({}),
    handler: async (params, ctx) => {
      const token = await ctx.storage.get('auth_token');
      return {
        data: [
          {
            isLoggedIn: token !== null,
            token: token ? (token as any).token?.substring(0, 20) + '...' : null,
            loginAt: token ? (token as any).at : null,
          },
        ],
      };
    },
  });
}
