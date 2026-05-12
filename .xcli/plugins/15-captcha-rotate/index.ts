import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const rotateResultSchema = z.object({
  targetAngle: z.number(),
  currentAngle: z.number().optional(),
  dragDistance: z.number().optional(),
  rotated: z.boolean(),
  verifyResult: z.string(),
});

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '15-captcha-rotate',
    url: crawlerUrl('15-captcha-rotate'),
  });

  site.command('scrape', {
    description: '读取旋转验证码目标角度，拖动控制条旋转图片',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      data: z.array(rotateResultSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#captcha-canvas', { timeout: 8000 });

        const pageState = await page.evaluate(() => {
          const w = window as unknown as Record<string, unknown>;
          return {
            targetAngle: typeof w.targetAngle === 'number' ? w.targetAngle : null,
            currentAngle: typeof w.currentAngle === 'number' ? w.currentAngle : 0,
            angleStep: typeof w.angleStep === 'number' ? w.angleStep : null,
          };
        });

        const canvasRect = await page.locator('#captcha-canvas').boundingBox();
        const angleDisplay = await page.evaluate(() => {
          const el = document.querySelector('.angle-display');
          return el?.textContent?.trim() ?? '';
        });

        const tips: string[] = [];
        tips.push(`目标角度: ${pageState.targetAngle}°, 当前: ${pageState.currentAngle}°`);
        tips.push(`角度显示: ${angleDisplay}`);

        let rotated = false;
        let dragDistance = 0;

        if (pageState.targetAngle !== null && canvasRect) {
          const deltaAngle = pageState.targetAngle - (pageState.currentAngle ?? 0);
          const controlRect = await page.evaluate(() => {
            const el =
              document.querySelector('.rotate-control') ??
              document.querySelector('.slider-track') ??
              document.querySelector('.drag-handle') ??
              document.querySelector('#captcha-canvas');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          });

          if (controlRect) {
            const pxPerDegree = controlRect.width / 360;
            dragDistance = Math.round(deltaAngle * pxPerDegree);

            const startX = controlRect.x + 10;
            const centerY = controlRect.y + controlRect.height / 2;

            await page.mouse.move(startX, centerY);
            await page.mouse.down();
            const steps = 20;
            for (let i = 1; i <= steps; i++) {
              const moveX = startX + (dragDistance * i) / steps;
              await page.mouse.move(moveX, centerY);
            }
            await page.mouse.up();
            rotated = true;
            tips.push(`已拖动 ${dragDistance}px (≈ ${deltaAngle}°)`);

            await page.waitForTimeout(1500);
          } else {
            tips.push('未找到旋转控制元素');
          }
        } else {
          tips.push(pageState.targetAngle === null ? '未读取到targetAngle' : 'canvas不可见');
        }

        const verifyResult = await page.evaluate(() => {
          const el =
            document.querySelector('.verify-result') ??
            document.querySelector('.result-text') ??
            document.querySelector('#result');
          return el?.textContent?.trim() ?? '';
        });

        tips.push(`验证结果: ${verifyResult || '操作完成'}`);

        return ok(
          [
            {
              targetAngle: pageState.targetAngle ?? 0,
              currentAngle: pageState.currentAngle,
              dragDistance,
              rotated,
              verifyResult: verifyResult || '操作完成',
            },
          ],
          tips
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });

  site.command('verify', {
    description: '验证旋转验证码页面可达且元素完整',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(rotateResultSchema),
      errors: z.array(z.object({ field: z.string(), expected: z.string(), actual: z.string() })),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) {
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '浏览器页面', actual: '无' }],
          tips: [],
        };
      }
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#captcha-canvas', { timeout: 8000 });

        const elements = await page.evaluate(() => ({
          captchaCanvas: !!document.getElementById('captcha-canvas'),
          angleDisplay: !!document.querySelector('.angle-display'),
        }));

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (!elements.captchaCanvas)
          errors.push({ field: 'captchaCanvas', expected: '存在', actual: '未找到' });
        if (!elements.angleDisplay)
          errors.push({ field: 'angleDisplay', expected: '存在', actual: '未找到' });

        const status = errors.length === 0 ? ('pass' as const) : ('fail' as const);
        const tips =
          status === 'pass' ? ['页面验证通过'] : [`问题: ${errors.map((e) => e.field).join(', ')}`];

        return { status, data: [], errors, tips };
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
