import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const itemSchema = z.object({
  name: z.string().describe('姓名'),
  role: z.string().describe('职位'),
  email: z.string().describe('邮箱'),
  projects: z.number().describe('项目数'),
  experience: z.number().describe('工作年限'),
  contributions: z.number().describe('贡献值'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '21-shadow-dom',
    url: crawlerUrl('21-shadow-dom'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '数据封装在 Shadow DOM 中。遍历 shadowRoot 提取封装的数据。',
    parameters: z.object({}),
    result: z.object({
      data: z.array(itemSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 21-shadow-dom scrape',
        output: `data:
  - name: "张伟"
    role: "高级工程师"
    email: "zhangwei@example.com"
    projects: 42
    experience: 5
    contributions: 156
tips:
  - "采集到 4 条 Shadow DOM 数据"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.shadow-app, .user-card-wrapper');
        await ctx.page.waitForTimeout(1000);

        const data = await ctx.page.evaluate(() => {
          const users: Array<{
            name: string;
            role: string;
            email: string;
            projects: number;
            experience: number;
            contributions: number;
          }> = [];
          for (let i = 1; i <= 4; i++) {
            const host = document.getElementById(`user-${i}`);
            if (!host || !host.shadowRoot) continue;

            const shadow = host.shadowRoot;
            const name = shadow.querySelector('.user-info h3')?.textContent?.trim() || '';
            const role = shadow.querySelector('.user-info .role')?.textContent?.trim() || '';
            const email = shadow.querySelector('.email')?.textContent?.trim() || '';

            let projects = 0;
            let experience = 0;
            let contributions = 0;
            const nestedHost = shadow.querySelector('.nested-host');
            if (nestedHost && nestedHost.shadowRoot) {
              const nestedShadow = nestedHost.shadowRoot;
              const statValues = nestedShadow.querySelectorAll('.stat-value');
              if (statValues.length >= 3) {
                projects = parseInt(statValues[0].textContent?.trim() || '0', 10);
                experience = parseInt(statValues[1].textContent?.trim() || '0', 10);
                contributions = parseInt(statValues[2].textContent?.trim() || '0', 10);
              }
            }

            users.push({ name, role, email, projects, experience, contributions });
          }
          return users;
        });

        return ok(data, [`采集到 ${data.length} 条 Shadow DOM 数据`]);
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
        cmd: 'xcli 21-shadow-dom verify',
        output: `status: pass
data:
  - name: "张伟"
    role: "高级工程师"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.shadow-app, .user-card-wrapper');
        await ctx.page.waitForTimeout(1000);

        const data = await ctx.page.evaluate(() => {
          const users: Array<{
            name: string;
            role: string;
            email: string;
            projects: number;
            experience: number;
            contributions: number;
          }> = [];
          for (let i = 1; i <= 4; i++) {
            const host = document.getElementById(`user-${i}`);
            if (!host || !host.shadowRoot) continue;

            const shadow = host.shadowRoot;
            const name = shadow.querySelector('.user-info h3')?.textContent?.trim() || '';
            const role = shadow.querySelector('.user-info .role')?.textContent?.trim() || '';
            const email = shadow.querySelector('.email')?.textContent?.trim() || '';

            let projects = 0;
            let experience = 0;
            let contributions = 0;
            const nestedHost = shadow.querySelector('.nested-host');
            if (nestedHost && nestedHost.shadowRoot) {
              const statValues = nestedHost.shadowRoot.querySelectorAll('.stat-value');
              if (statValues.length >= 3) {
                projects = parseInt(statValues[0].textContent?.trim() || '0', 10);
                experience = parseInt(statValues[1].textContent?.trim() || '0', 10);
                contributions = parseInt(statValues[2].textContent?.trim() || '0', 10);
              }
            }

            users.push({ name, role, email, projects, experience, contributions });
          }
          return users;
        });

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (data.length !== 4) {
          errors.push({ field: 'count', expected: '4', actual: String(data.length) });
        }
        data.forEach((item, i) => {
          if (!item.name) errors.push({ field: `[${i}].name`, expected: '非空', actual: '空' });
          if (!item.role) errors.push({ field: `[${i}].role`, expected: '非空', actual: '空' });
          if (!item.email) errors.push({ field: `[${i}].email`, expected: '非空', actual: '空' });
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
