import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const uploadResultSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  uploadStatus: z.string(),
  ocrText: z.string(),
  recognizedChars: z.array(z.string()).optional(),
});

const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKklEQVQ4y2P8z8BQz0BFwMgwakCh' +
  'AABnOwID/5MX1QAAAABJRU5ErkJggg==';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '17-file-upload',
    url: crawlerUrl('17-file-upload'),
  });

  site.command('scrape', {
    description: '上传测试图片并获取模拟OCR识别结果',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      data: z.array(uploadResultSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#file-input', { timeout: 8000, state: 'attached' });

        const tips: string[] = [];
        const testBuffer = Buffer.from(TEST_PNG_BASE64, 'base64');
        const testFileName = 'test-ocr-image.png';

        await page.setInputFiles('#file-input', {
          name: testFileName,
          mimeType: 'image/png',
          buffer: testBuffer,
        });
        tips.push(`已选择文件: ${testFileName} (${testBuffer.length} bytes)`);

        const uploadBtn = page.locator('#upload-btn');
        const hasUploadBtn = (await uploadBtn.count()) > 0;
        if (hasUploadBtn) {
          await uploadBtn.click();
          tips.push('已点击上传按钮');
          await page.waitForTimeout(1500);
        } else {
          tips.push('未找到上传按钮，尝试等待自动处理');
          await page.waitForTimeout(2000);
        }

        const uploadResult = await page.evaluate(() => {
          const resultEl =
            document.querySelector('#upload-result') ??
            document.querySelector('.upload-result') ??
            document.querySelector('.result-text');
          const statusEl =
            document.querySelector('#upload-status') ?? document.querySelector('.upload-status');

          return {
            resultText: resultEl?.textContent?.trim() ?? '',
            statusText: statusEl?.textContent?.trim() ?? '',
            hasResult: !!resultEl && resultEl.textContent?.trim().length > 0,
          };
        });

        tips.push(`上传状态: ${uploadResult.statusText || '处理中'}`);
        tips.push(`OCR结果: ${uploadResult.resultText || '等待中'}`);

        const recognizedChars = uploadResult.resultText
          ? uploadResult.resultText.split('').filter((c) => c.trim().length > 0)
          : [];

        return ok(
          [
            {
              fileName: testFileName,
              fileSize: testBuffer.length,
              uploadStatus: uploadResult.statusText || '已处理',
              ocrText: uploadResult.resultText || '无结果',
              recognizedChars: recognizedChars.length > 0 ? recognizedChars : undefined,
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
    description: '验证文件上传页面可达且元素完整',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(uploadResultSchema),
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
        await page.waitForSelector('#file-input', { timeout: 8000, state: 'attached' });

        const elements = await page.evaluate(() => ({
          fileInput: !!document.getElementById('file-input'),
          uploadBtn: !!document.getElementById('upload-btn'),
          uploadResult: !!document.getElementById('upload-result'),
          uploadZone: !!document.querySelector('.upload-zone'),
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
            : [`缺少: ${errors.map((e) => e.field).join(', ')}`];

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
