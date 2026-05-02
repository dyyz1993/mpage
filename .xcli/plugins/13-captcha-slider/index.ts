import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const sliderResultSchema = z.object({
  targetX: z.number(),
  tolerance: z.number().nullable(),
  sliderMoved: z.boolean(),
  verifyResult: z.string(),
});

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '13-captcha-slider',
    url: crawlerUrl('13-captcha-slider'),
  });

  site.command('scrape', {
    description: '分析滑块验证码，读取targetX并拖动滑块到正确位置',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      data: z.array(sliderResultSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('.slider-knob', { timeout: 8000 });

        const pageState = await page.evaluate(() => {
          const w = window as unknown as Record<string, unknown>;
          return {
            targetX: typeof w.targetX === 'number' ? w.targetX : null,
            tolerance: typeof w.tolerance === 'number' ? w.tolerance : null,
          };
        });

        const tips: string[] = [];
        let sliderMoved = false;
        let verifyResult = '未执行';

        if (pageState.targetX === null) {
          tips.push('未能从页面JS上下文读取targetX');
          return ok(
            [{ targetX: 0, tolerance: pageState.tolerance, sliderMoved: false, verifyResult }],
            tips
          );
        }

        tips.push(`目标X: ${pageState.targetX}px, 容差: ${pageState.tolerance ?? '未知'}`);

        const knobBox = await page.locator('.slider-knob').boundingBox();
        if (!knobBox) {
          tips.push('滑块元素不可见');
          return ok(
            [
              {
                targetX: pageState.targetX,
                tolerance: pageState.tolerance,
                sliderMoved: false,
                verifyResult,
              },
            ],
            tips
          );
        }

        const startX = knobBox.x + knobBox.width / 2;
        const startY = knobBox.y + knobBox.height / 2;
        const targetPixelX = pageState.targetX;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
          const moveX = startX + (targetPixelX * i) / steps;
          const jitter = (Math.random() - 0.5) * 2;
          await page.mouse.move(moveX, startY + jitter);
        }
        await page.mouse.up();
        sliderMoved = true;
        tips.push(`已拖动滑块 ${targetPixelX}px (${steps}步)`);

        await page.waitForTimeout(1500);

        const result = await page.evaluate(() => {
          const el =
            document.querySelector('.verify-result') ??
            document.querySelector('.result-text') ??
            document.querySelector('#result') ??
            document.querySelector('.captcha-result');
          return el?.textContent?.trim() ?? '';
        });
        verifyResult = result || '操作完成';
        tips.push(`验证结果: ${verifyResult}`);

        return ok(
          [
            {
              targetX: pageState.targetX,
              tolerance: pageState.tolerance,
              sliderMoved,
              verifyResult,
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
    description: '验证滑块验证码页面可达且元素完整',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(sliderResultSchema),
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
        await page.waitForSelector('.slider-knob', { timeout: 8000 });

        const elements = await page.evaluate(() => ({
          bgCanvas: !!document.getElementById('bg-canvas'),
          sliderCanvas: !!document.getElementById('slider-canvas'),
          sliderTrack: !!document.querySelector('.slider-track'),
          sliderKnob: !!document.querySelector('.slider-knob'),
        }));

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        const entries = Object.entries(elements) as Array<[string, boolean]>;
        for (const [name, found] of entries) {
          if (!found) errors.push({ field: name, expected: '存在', actual: '未找到' });
        }

        const status = errors.length === 0 ? ('pass' as const) : ('fail' as const);
        const tips =
          status === 'pass'
            ? ['页面元素验证通过']
            : [`缺少元素: ${errors.map((e) => e.field).join(', ')}`];

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
