import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const itemSchema = z.object({
  id: z.number().describe('帖子ID'),
  title: z.string().describe('标题'),
  author: z.string().describe('作者'),
  timestamp: z.string().describe('时间'),
  content: z.string().describe('内容'),
  tags: z.array(z.string()).describe('标签'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '30-xhr-intercept',
    url: crawlerUrl('30-xhr-intercept'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '数据完全通过 XHR 加载。拦截请求或直接调用 API。',
    parameters: z.object({}),
    result: z.object({
      data: z.array(itemSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 30-xhr-intercept scrape',
        output: `data:
  - id: 1
    title: "示例帖子"
    author: "作者"
    timestamp: "2024-01-01"
    content: "内容"
    tags: ["标签"]
tips:
  - "采集到 10 条 XHR 数据"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url, { waitUntil: 'networkidle' });

        await ctx.page.waitForSelector('.post-item', { timeout: 10000 });

        const data = await ctx.page.evaluate(() => {
          const posts = document.querySelectorAll('.post-item');
          return Array.from(posts).map((post) => {
            const id = parseInt(post.getAttribute('data-id') || '0');
            const title = post.querySelector('.post-title')?.textContent?.trim() || '';
            const meta = post.querySelector('.post-meta');
            const author =
              meta?.querySelector('span:first-child')?.textContent?.replace('👤', '').trim() || '';
            const timestamp =
              meta?.querySelector('span:last-child')?.textContent?.replace('🕐', '').trim() || '';
            const content = post.querySelector('.post-content')?.textContent?.trim() || '';
            const tags = Array.from(post.querySelectorAll('.tag')).map(
              (t) => t.textContent?.trim() || ''
            );
            return { id, title, author, timestamp, content, tags };
          });
        });

        return ok(data, [`采集到 ${data.length} 条 XHR 数据`]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });

  plugin.command('verify', {
    description: '自动验证采集结果',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(itemSchema),
      errors: z.array(
        z.object({
          field: z.string(),
          expected: z.string(),
          actual: z.string(),
        })
      ),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 30-xhr-intercept verify',
        output: `status: pass
data:
  - id: 1
    title: "示例帖子"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url, { waitUntil: 'networkidle' });
        await ctx.page.waitForSelector('.post-item', { timeout: 10000 });

        const data = await ctx.page.evaluate(() => {
          const posts = document.querySelectorAll('.post-item');
          return Array.from(posts).map((post) => {
            const id = parseInt(post.getAttribute('data-id') || '0');
            const title = post.querySelector('.post-title')?.textContent?.trim() || '';
            const meta = post.querySelector('.post-meta');
            const author =
              meta?.querySelector('span:first-child')?.textContent?.replace('👤', '').trim() || '';
            const timestamp =
              meta?.querySelector('span:last-child')?.textContent?.replace('🕐', '').trim() || '';
            const content = post.querySelector('.post-content')?.textContent?.trim() || '';
            const tags = Array.from(post.querySelectorAll('.tag')).map(
              (t) => t.textContent?.trim() || ''
            );
            return { id, title, author, timestamp, content, tags };
          });
        });

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (data.length === 0) errors.push({ field: 'count', expected: '>0', actual: '0' });
        data.forEach((item, i) => {
          if (!item.title) errors.push({ field: `[${i}].title`, expected: '非空', actual: '空' });
          if (!item.author) errors.push({ field: `[${i}].author`, expected: '非空', actual: '空' });
        });

        const status = errors.length === 0 ? ('pass' as const) : ('fail' as const);
        const tips = status === 'pass' ? ['校验通过'] : [`${errors.length} 个问题`];

        return { status, data, errors, tips };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '加载成功', actual: msg }],
          tips: [],
        };
      }
    },
  });
}
