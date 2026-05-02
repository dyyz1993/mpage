import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

// 数据 schema（根据实际情况调整）
const itemSchema = z.object({
  title: z.string().describe('标题'),
  // 根据案例需求添加更多字段
});

// 结果 schema
const resultSchema = z.object({
  data: z.array(itemSchema),
  tips: z.array(z.string()).optional().default([]),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '11-session',
    url: crawlerUrl('11-session'),
    requiresLogin: true,
  });

  // scrape 命令：采集数据
  plugin.command('scrape', {
    description: '登录后访问受限页面。携带Cookie访问并维持会话状态。',
    parameters: z.object({
      // 根据需要添加参数
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 11-session scrape',
        output: `data:
  - title: "示例数据"
tips:
  - "采集成功"`,
      },
    ],
    handler: async (params, ctx) => {
      // TODO: 实现采集逻辑
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/11-session.html'
      );
      await ctx.page.waitForSelector('h2');

      const data = await ctx.page.evaluate(() => {
        // TODO: 根据页面结构提取数据
        return [];
      });

      return {
        data,
        tips: [`采集到 ${data.length} 条 Session 数据`],
      };
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
        cmd: 'xcli 11-session verify',
        output: `status: pass
data:
  - title: "示例数据"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/11-session.html'
      );
      await ctx.page.waitForSelector('h2');

      const data = await ctx.page.evaluate(() => {
        return [];
      });

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips =
        status === 'pass'
          ? [`校验通过, ${data.length} 条数据`]
          : [`校验失败, ${errors.length} 个问题`];

      return { status, data, errors, tips };
    },
  });
}
