import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { ok, fail } from 'xcli';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'login-example',
    url: 'https://example.com', // TODO: 替换为实际 URL

    // 声明该站点需要登录，框架会在执行其他命令前自动检测
    requiresLogin: true,

    // 框架调用此函数判断当前是否已登录
    async isLogin(ctx) {
      if (!ctx.page) return false;

      // TODO: 替换为实际的登录检测逻辑（检查登录后才有的元素或 cookie）
      await ctx.page.goto('https://example.com/dashboard'); // TODO: 替换为需要登录的页面
      const userMenu = await ctx.page.$('.user-avatar'); // TODO: 替换为登录后才有的选择器
      return userMenu !== null;
    },
  });

  // ── 登录命令 ──────────────────────────────────────────
  site.command('login', {
    description: '登录站点（账号密码方式）',

    parameters: z.object({
      username: z.string().describe('用户名'),
      password: z.string().describe('密码'),
    }),

    async handler(params, ctx) {
      if (!ctx.page) {
        return fail('登录需要浏览器页面');
      }

      // TODO: 替换为实际登录页 URL
      await ctx.page.goto('https://example.com/login');

      // 填写表单
      await ctx.page.waitForSelector('input[name="username"]'); // TODO: 替换选择器
      await ctx.page.type('input[name="username"]', params.username, { delay: 50 });
      await ctx.page.type('input[name="password"]', params.password, { delay: 50 });

      // 点击登录
      await ctx.page.click('button[type="submit"]'); // TODO: 替换选择器

      // 等待登录成功（跳转或元素出现）
      await ctx.page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});

      // 将 token/cookie 持久化到 storage，下次复用
      const cookies = await ctx.page.cookies();
      const tokenCookie = cookies.find((c) => c.name === 'session_token'); // TODO: 替换 cookie 名
      if (tokenCookie) {
        await ctx.storage.set('auth_token', tokenCookie.value);
      }

      return ok({ loggedIn: true }, ['登录成功']);
    },
  });

  // ── 登出命令 ──────────────────────────────────────────
  site.command('logout', {
    description: '登出站点',

    async handler(_params, ctx) {
      // 清除本地存储的认证信息
      await ctx.storage.delete('auth_token');

      if (ctx.page) {
        // TODO: 替换为实际登出 URL 或操作
        await ctx.page.goto('https://example.com/logout');
      }

      return ok({ loggedOut: true }, ['已登出']);
    },
  });

  // ── 需要登录的采集命令 ────────────────────────────────
  site.command('scrape', {
    description: '采集需要登录才能访问的数据',

    parameters: z.object({
      limit: z.number().default(20).describe('最大条数'),
    }),

    async handler(params, ctx) {
      if (!ctx.page) {
        return fail('采集需要浏览器页面');
      }

      // 恢复已保存的 token（可选：框架 may 自动处理 cookie 恢复）
      const token = await ctx.storage.get('auth_token');
      if (token) {
        await ctx.page.setCookie({
          name: 'session_token', // TODO: 替换 cookie 名
          value: token as string,
          domain: 'example.com', // TODO: 替换域名
          path: '/',
        });
      }

      // TODO: 替换为需要登录后才能访问的页面
      await ctx.page.goto('https://example.com/my-data');
      await ctx.page.waitForSelector('.data-item', { timeout: 10000 }); // TODO: 替换选择器

      const items = await ctx.page.evaluate((limit) => {
        const elements = Array.from(document.querySelectorAll('.data-item')); // TODO: 替换选择器
        return elements.slice(0, limit).map((el) => ({
          title: (el.querySelector('.title') as HTMLElement)?.textContent?.trim() ?? '',
          value: (el.querySelector('.value') as HTMLElement)?.textContent?.trim() ?? '',
        }));
      }, params.limit);

      if (items.length === 0) {
        return fail('未获取到数据', ['可能需要重新登录']);
      }

      return ok(items);
    },
  });
}
