import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '25-video-website',
    url: crawlerUrl('25-video-site'),
  });

  site.command('scrape', {
    description: '提取视频信息、弹幕内容（时间+文本）、所有评论页。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        await ctx.page.waitForTimeout(2000);
        const data = await ctx.page.evaluate(() => {
          const videoTitle = document.querySelector('.video-title')?.textContent?.trim() || '';

          const videoStats = Array.from(document.querySelectorAll('.video-stats span')).map(
            (s) => s.textContent?.trim() || ''
          );

          const uploader = {
            name: document.querySelector('.uploader-name')?.textContent?.trim() || '',
            stats: document.querySelector('.uploader-stats')?.textContent?.trim() || '',
          };

          const description =
            document.querySelector('.video-description')?.textContent?.trim() || '';

          const danmakuList = Array.from(document.querySelectorAll('.danmaku-list-item')).map(
            (el) => ({
              time: el.querySelector('.danmaku-time')?.textContent?.trim() || '',
              text: el.querySelector('.danmaku-text')?.textContent?.trim() || '',
            })
          );

          const comments = Array.from(document.querySelectorAll('.comment-item')).map((el) => ({
            avatar: el.querySelector('.comment-avatar')?.textContent?.trim() || '',
            user: el.querySelector('.comment-user')?.textContent?.trim() || '',
            time: el.querySelector('.comment-time')?.textContent?.trim() || '',
            content: el.querySelector('.comment-text')?.textContent?.trim() || '',
            likes: el.querySelector('.comment-action')?.textContent?.trim() || '',
          }));

          const recommended = Array.from(document.querySelectorAll('.recommended-card')).map(
            (el) => ({
              title: el.querySelector('.recommended-title')?.textContent?.trim() || '',
              meta: el.querySelector('.recommended-meta')?.textContent?.trim() || '',
              duration: el.querySelector('.recommended-duration')?.textContent?.trim() || '',
            })
          );

          return {
            videoTitle,
            videoStats,
            uploader,
            description,
            danmakuList,
            comments,
            recommended,
          };
        });
        return ok(data, [
          `视频: ${data.videoTitle}`,
          `弹幕: ${data.danmakuList.length} 条, 评论: ${data.comments.length} 条, 推荐: ${data.recommended.length} 个`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
