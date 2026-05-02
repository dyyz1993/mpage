import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

interface CharPosition {
  char: string;
  x: number;
  y: number;
  color: string;
}

const clickResultSchema = z.object({
  question: z.string(),
  charsToClick: z.array(z.string()),
  charPositions: z.array(
    z.object({
      char: z.string(),
      x: z.number(),
      y: z.number(),
      color: z.string(),
    })
  ),
  clickedChars: z.array(z.string()),
  verifyResult: z.string(),
});

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '14-captcha-click',
    url: crawlerUrl('14-captcha-click'),
  });

  site.command('scrape', {
    description: '识别点击验证码题目，读取字符坐标并按顺序点击',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      data: z.array(clickResultSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#captcha-canvas', { timeout: 8000 });

        const pageData = await page.evaluate(() => {
          const w = window as unknown as Record<string, unknown>;
          const questionEl = document.querySelector('.captcha-question');
          const questionText = questionEl?.textContent?.trim() ?? '';

          let charPositions: Array<{ char: string; x: number; y: number; color: string }> = [];
          if (Array.isArray(w.charPositions)) {
            charPositions = w.charPositions as Array<{
              char: string;
              x: number;
              y: number;
              color: string;
            }>;
          }

          const canvas = document.getElementById('captcha-canvas');
          const canvasRect = canvas?.getBoundingClientRect();
          const canvasInfo = canvasRect
            ? {
                x: canvasRect.x,
                y: canvasRect.y,
                width: canvasRect.width,
                height: canvasRect.height,
              }
            : null;

          return { questionText, charPositions, canvasInfo };
        });

        const tips: string[] = [];
        tips.push(`题目: ${pageData.questionText}`);

        const charsToClick = extractCharsFromQuestion(pageData.questionText);
        tips.push(`需点击字符: ${charsToClick.join(' → ')}`);

        const clickedChars: string[] = [];

        if (charsToClick.length > 0 && pageData.charPositions.length > 0 && pageData.canvasInfo) {
          const canvasInfo = pageData.canvasInfo;

          for (const targetChar of charsToClick) {
            const found = pageData.charPositions.find((p: CharPosition) => p.char === targetChar);
            if (found) {
              const clickX = canvasInfo.x + found.x;
              const clickY = canvasInfo.y + found.y;
              await page.mouse.click(clickX, clickY);
              clickedChars.push(targetChar);
              tips.push(
                `已点击 "${targetChar}" (${found.color}) at (${Math.round(clickX)}, ${Math.round(clickY)})`
              );
              await page.waitForTimeout(400);
            } else {
              tips.push(`未找到字符 "${targetChar}" 的坐标`);
            }
          }
        } else {
          tips.push('未能获取字符坐标信息，仅提取页面数据');
        }

        await page.waitForTimeout(800);

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
              question: pageData.questionText,
              charsToClick,
              charPositions: pageData.charPositions.map((p: CharPosition) => ({
                char: p.char,
                x: p.x,
                y: p.y,
                color: p.color,
              })),
              clickedChars,
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
    description: '验证点击验证码页面可达且元素完整',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(clickResultSchema),
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
          captchaQuestion: !!document.querySelector('.captcha-question'),
          hasQuestionText:
            (document.querySelector('.captcha-question')?.textContent?.trim().length ?? 0) > 0,
        }));

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (!elements.captchaCanvas)
          errors.push({ field: 'captchaCanvas', expected: '存在', actual: '未找到' });
        if (!elements.captchaQuestion)
          errors.push({ field: 'captchaQuestion', expected: '存在', actual: '未找到' });
        if (!elements.hasQuestionText)
          errors.push({ field: 'questionText', expected: '有内容', actual: '空' });

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

function extractCharsFromQuestion(question: string): string[] {
  const match = question.match(/[:：]\s*(.+)/);
  if (!match) return [];
  const charPart = match[1].trim();
  const chars = charPart.split(/[、,\s，]+/).filter((c) => c.length === 1);
  return chars;
}
