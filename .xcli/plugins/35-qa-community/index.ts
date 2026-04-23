#!/usr/bin/env node

import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '35-qa-community',
    url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/35-qa-community.html',
    requiresLogin: true,
  });

  plugin.command('captcha', {
    description: '获取点选验证码',
    requiresLogin: false,
    parameters: z.object({}),
    // @ts-ignore
    handler: async () => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const res = await fetchJSON(`${TARGET}/click-captcha`);
      return res;
    },
  });

  plugin.command('login', {
    description: '登录知识问答社区',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin').describe('用户名'),
      password: z.string().default('password').describe('密码'),
      captchaId: z.string().describe('验证码ID'),
      positions: z.string().describe('点击位置，如 "0,1,2"'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const positions = params.positions.split(',').map((p: string) => parseInt(p.trim()));

      const loginRes = await fetchJSON(`${TARGET}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: params.username,
          password: params.password,
          captchaId: params.captchaId,
          positions,
        }),
      });

      if (!loginRes.success) {
        return { success: false, message: loginRes.message };
      }

      await ctx.storage.set('auth_token', loginRes.token);
      return { success: true, message: '登录成功', token: loginRes.token.substring(0, 20) + '...' };
    },
  });

  plugin.command('questions', {
    description: '获取问题列表',
    requiresLogin: false,
    parameters: z.object({
      page: z.number().default(1).describe('页码'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const res = await fetchJSON(`${TARGET}/questions?page=${params.page}`);
      return res;
    },
  });

  plugin.command('scrape', {
    description: '采集所有问题',
    requiresLogin: false,
    parameters: z.object({}),
    // @ts-ignore
    handler: async (_params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const allQuestions: any[] = [];
      let page = 1;

      while (true) {
        const res = await fetchJSON(`${TARGET}/questions?page=${page}`);
        allQuestions.push(...res.questions);
        if (!res.hasMore) break;
        page++;
      }

      return {
        summary: { total: allQuestions.length },
        questions: allQuestions,
      };
    },
  });

  plugin.command('vote', {
    description: '给问题投票',
    requiresLogin: true,
    parameters: z.object({
      questionId: z.string().describe('问题ID'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const token = await ctx.storage.get('auth_token');

      const res = await fetchJSON(`${TARGET}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId: params.questionId }),
      });

      return res;
    },
  });

  plugin.command('user', {
    description: '获取用户信息（包含Shadow DOM内容）',
    requiresLogin: true,
    parameters: z.object({
      questionId: z.string().describe('问题ID'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
      const TARGET = `${BASE_URL}/examples/35`;

      const html = await ctx.page.content();
      const userInfo = await ctx.page.evaluate((qId: string) => {
        const question = document.querySelector(`[data-id="${qId}"]`);
        if (!question) return null;
        const shadowHost = question.querySelector('.author-info');
        if (!shadowHost) return null;
        const shadow = shadowHost.shadowRoot;
        if (!shadow) return null;
        const name = shadow.querySelector('.author-name')?.textContent;
        const avatar = shadow.querySelector('.author-avatar')?.textContent;
        return { name, avatar };
      }, params.questionId);

      return { questionId: params.questionId, user: userInfo };
    },
  });
}
