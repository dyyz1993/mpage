import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

// 数据 schema
const itemSchema = z.object({
  requestNum: z.number().describe('请求编号'),
  status: z.number().describe('HTTP状态码'),
  message: z.string().describe('响应消息'),
  limited: z.boolean().describe('是否被限流'),
  timestamp: z.string().describe('时间戳'),
});

// 结果 schema
const resultSchema = z.object({
  data: z.array(itemSchema),
  tips: z.array(z.string()).optional().default([]),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '09-rate-limit',
    url: crawlerUrl('09-rate-limit'),
    requiresLogin: false,
  });

  // scrape 命令：采集数据
  plugin.command('scrape', {
    description: '模拟服务器限流（快速返回429）。处理限流响应和请求延时。',
    parameters: z.object({
      requests: z.number().int().min(1).max(20).default(15).describe('发送请求数量'),
      delay: z.number().int().min(100).max(2000).default(200).describe('请求间隔（毫秒）'),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 09-rate-limit scrape',
        output: `data:
  - requestNum: 1
    status: 200
    message: "成功"
    limited: false
tips:
  - "测试完成，发送了 15 个请求"`,
      },
    ],
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/09-rate-limit.html'
      );
      await ctx.page.waitForSelector('h1');

      const data = await ctx.page.evaluate(
        async ({ requestCount, requestDelay }) => {
          const results: Array<{
            requestNum: number;
            status: number;
            message: string;
            limited: boolean;
            timestamp: string;
          }> = [];

          // 重置限流
          const buttons = Array.from(document.querySelectorAll('button'));
          const resetButton = buttons.find((b) => b.textContent?.includes('重置限流计数'));
          if (resetButton) {
            (resetButton as HTMLButtonElement).click();
          }

          // 等待重置完成
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 发送请求
          for (let i = 1; i <= requestCount; i++) {
            const buttons = Array.from(document.querySelectorAll('button'));
            const singleRequestButton = buttons.find((b) =>
              b.textContent?.includes('发送单个请求')
            );
            if (singleRequestButton) {
              (singleRequestButton as HTMLButtonElement).click();

              // 等待响应
              await new Promise((resolve) => setTimeout(resolve, 300));

              // 获取当前状态
              const statusBadge = document.getElementById('status-badge');
              const statusText = statusBadge?.textContent || '正常';
              const isLimited =
                statusText.includes('限流') || statusText.includes('Too Many Requests');

              results.push({
                requestNum: i,
                status: isLimited ? 429 : 200,
                message: isLimited ? 'Too Many Requests' : '成功',
                limited: isLimited,
                timestamp: new Date().toISOString(),
              });
            }

            // 等待
            if (i < requestCount) {
              await new Promise((resolve) => setTimeout(resolve, requestDelay));
            }
          }

          return results;
        },
        { requestCount: params.requests, requestDelay: params.delay }
      );

      const limitedCount = data.filter((item) => item.limited).length;
      const successCount = data.filter((item) => !item.limited).length;

      return {
        data,
        tips: [
          `测试完成，发送了 ${data.length} 个请求`,
          `成功: ${successCount}, 限流: ${limitedCount}`,
          limitedCount > 0 ? '⚠️  检测到限流，建议增加请求间隔' : '✅ 未触发限流',
        ],
      };
    },
  });

  // verify 命令：自动验证
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
        cmd: 'xcli 09-rate-limit verify',
        output: `status: pass
data:
  - requestNum: 1
    status: 200
    limited: false
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/09-rate-limit.html'
      );
      await ctx.page.waitForSelector('h1');

      // 发送 12 个请求（应该触发限流，因为限制是 10 次/分钟）
      const data = await ctx.page.evaluate(async () => {
        const results: Array<any> = [];

        // 重置限流
        const buttons = Array.from(document.querySelectorAll('button'));
        const resetButton = buttons.find((b) => b.textContent?.includes('重置限流计数'));
        if (resetButton) {
          (resetButton as HTMLButtonElement).click();
        }

        // 等待重置完成
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 快速发送 12 个请求
        for (let i = 1; i <= 12; i++) {
          const buttons = Array.from(document.querySelectorAll('button'));
          const singleRequestButton = buttons.find((b) => b.textContent?.includes('发送单个请求'));
          if (singleRequestButton) {
            (singleRequestButton as HTMLButtonElement).click();
            await new Promise((resolve) => setTimeout(resolve, 100)); // 快速发送

            const statusBadge = document.getElementById('status-badge');
            const statusText = statusBadge?.textContent || '正常';
            const isLimited =
              statusText.includes('限流') || statusText.includes('Too Many Requests');

            results.push({
              requestNum: i,
              status: isLimited ? 429 : 200,
              message: isLimited ? 'Too Many Requests' : '成功',
              limited: isLimited,
              timestamp: new Date().toISOString(),
            });
          }
        }

        return results;
      });

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      // 验证是否发送了 12 个请求
      if (data.length !== 12) {
        errors.push({ field: 'length', expected: '12', actual: String(data.length) });
      }

      // 验证是否触发了限流
      const limitedCount = data.filter((item) => item.limited).length;
      if (limitedCount === 0) {
        errors.push({ field: 'limitedCount', expected: '> 0', actual: '0' });
      }

      // 验证至少有 9 个成功的请求（第 10 个可能被限流）
      const successCount = data.filter((item) => !item.limited).length;
      if (successCount < 9) {
        errors.push({ field: 'successCount', expected: '>= 9', actual: String(successCount) });
      }

      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips =
        status === 'pass'
          ? ['校验通过，成功检测到限流机制']
          : [`校验失败，发现 ${errors.length} 个问题`];

      return { status, data, errors, tips };
    },
  });
}
