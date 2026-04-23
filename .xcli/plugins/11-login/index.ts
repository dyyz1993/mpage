import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
const LOGIN_URL = `${BASE_URL}/examples/10/login`;
const PROFILE_URL = `${BASE_URL}/examples/11/profile`;

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '11-login',
    url: PROFILE_URL,
  });

  plugin.command('login', {
    description: '登录获取凭证',
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto(LOGIN_URL);
      await ctx.page.waitForLoadState('domcontentloaded');

      const loginUrl = LOGIN_URL;
      const response = await ctx.page.evaluate(
        async ([url, body]) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
          return res.json();
        },
        [
          loginUrl,
          JSON.stringify({
            username: params.username,
            password: params.password,
          }),
        ]
      );

      if (response.success) {
        await ctx.storage.set('auth_token', { token: response.token, at: Date.now() });
        return {
          data: [{ success: true, message: '登录成功' }],
          tips: ['登录成功'],
        };
      } else {
        return {
          data: [{ success: false, message: response.message || '登录失败' }],
          tips: ['登录失败'],
        };
      }
    },
  });

  plugin.command('scrape', {
    description: '采集用户信息',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      const tokenData = await ctx.storage.get('auth_token');
      const token = (tokenData as any)?.token;

      if (!token) {
        return {
          data: [],
          errors: [{ field: 'auth', expected: 'valid token', actual: 'no token' }],
          tips: ['请先登录: xcli 11-login login'],
        };
      }

      const profileUrl = PROFILE_URL;
      const response = await ctx.page.evaluate(
        async ([url, authToken]) => {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          return res.json();
        },
        [profileUrl, token]
      );

      if (!response.success) {
        return {
          data: [],
          errors: [{ field: 'profile', expected: 'success', actual: response.error || 'failed' }],
          tips: [response.error || '获取用户信息失败'],
        };
      }

      const { user } = response;
      return {
        data: [
          {
            username: user.username,
            email: user.email,
            posts: user.posts,
            followers: user.followers,
            following: user.following,
            recentPosts: user.recentPosts || [],
          },
        ],
        tips: [`采集到用户: ${user.username}`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验用户信息',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      const tokenData = await ctx.storage.get('auth_token');
      const token = (tokenData as any)?.token;
      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!token) {
        errors.push({ field: 'auth', expected: 'valid token', actual: 'no token' });
        return {
          data: [],
          errors,
          tips: ['请先登录: xcli 11-login login'],
        };
      }

      const profileUrl = PROFILE_URL;
      const response = await ctx.page.evaluate(
        async ([url, authToken]) => {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          return res.json();
        },
        [profileUrl, token]
      );

      if (!response.success) {
        errors.push({ field: 'profile', expected: 'success', actual: response.error || 'failed' });
        return {
          data: [],
          errors,
          tips: [`发现 ${errors.length} 个问题`],
        };
      }

      const { user } = response;

      if (!user.username || user.username !== 'admin') {
        errors.push({ field: 'username', expected: 'admin', actual: user.username || 'undefined' });
      }

      if (!user.email || !user.email.includes('@')) {
        errors.push({
          field: 'email',
          expected: 'valid email with @',
          actual: user.email || 'undefined',
        });
      }

      if (typeof user.posts !== 'number' || user.posts <= 0) {
        errors.push({ field: 'posts', expected: 'positive integer', actual: String(user.posts) });
      }

      if (!Array.isArray(user.recentPosts)) {
        errors.push({ field: 'recentPosts', expected: 'array', actual: typeof user.recentPosts });
      }

      return {
        data: [
          {
            username: user.username,
            email: user.email,
            posts: user.posts,
            followers: user.followers,
            following: user.following,
            recentPosts: user.recentPosts || [],
          },
        ],
        errors,
        tips: errors.length === 0 ? ['校验通过'] : [`发现 ${errors.length} 个问题`],
      };
    },
  });
}
