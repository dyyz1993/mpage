import type { XCLIAPI } from 'xcli';
import type { NetworkCapture } from '@xcli/browser-app';
import { z } from 'zod';

const API = {
  posts: /\/aweme\/v1\/web\/aweme\/post\//,
  detail: /\/aweme\/v1\/web\/aweme\/detail\//,
  comments: /\/aweme\/v1\/web\/comment\/list\//,
  profile: /\/aweme\/v1\/web\/user\/profile\/other\//,
};

function n(v: unknown): number {
  return Number(v ?? 0);
}

function s(v: unknown): string {
  return String(v ?? '');
}

function firstUrl(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const urls = (obj as Record<string, unknown>)?.url_list;
  if (Array.isArray(urls) && typeof urls[0] === 'string') return urls[0];
  return '';
}

function g(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function parseVideo(item: Record<string, unknown>) {
  const ct = n(item.create_time);
  const stats = (item.statistics ?? {}) as Record<string, unknown>;
  const vid = (item.video ?? {}) as Record<string, unknown>;
  const auth = (item.author ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(item.text_extra)
    ? item.text_extra.map((t: unknown) => s(g(t, 'hashtag_name'))).filter(Boolean)
    : [];

  return {
    awemeId: s(item.aweme_id),
    desc: s(item.desc),
    createTime: ct,
    createTimeStr: new Date(ct * 1000).toISOString().replace('T', ' ').slice(0, 19),
    author: {
      uid: s(auth.uid),
      nickname: s(auth.nickname),
      avatar: firstUrl(auth.avatar_thumb),
    },
    video: {
      playUrl: firstUrl(vid.play_addr),
      cover: firstUrl(vid.cover),
      width: n(vid.width),
      height: n(vid.height),
      duration: n(vid.duration),
    },
    statistics: {
      diggCount: n(stats.digg_count),
      commentCount: n(stats.comment_count),
      shareCount: n(stats.share_count),
      playCount: n(stats.play_count),
    },
    tagNames: tags,
  };
}

async function scrollAndCollect(
  page: any,
  network: NetworkCapture,
  pattern: RegExp,
  maxPages: number,
  scrollFn: () => Promise<void>
) {
  for (let i = 0; i < maxPages; i++) {
    const prev = network.filter(pattern).length;
    await scrollFn();
    const captured = await network.waitFor(pattern, 5000);
    if (!captured && network.filter(pattern).length === prev && i > 0) break;
    const items = network.filter(pattern);
    const lastBody = items[items.length - 1]?.body as Record<string, unknown> | undefined;
    if (lastBody && !lastBody.has_more) break;
  }
}

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'douyin',
    url: 'https://www.douyin.com',
    description: '抖音数据采集',
  });

  site.command('videos', {
    description: '采集用户作品列表',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('用户主页 URL'),
      maxPages: z.number().default(5).describe('最大翻页数'),
    }),
    handler: async (params, ctx) => {
      const network = ctx.config.network as NetworkCapture;
      const page = ctx.page as import('playwright-core').Page;

      await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await scrollAndCollect(page, network, API.posts, params.maxPages, () =>
        page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      );

      const posts = network.filter(API.posts);
      const allItems = posts.flatMap((d) =>
        Array.isArray((d.body as Record<string, unknown>)?.aweme_list)
          ? ((d.body as Record<string, unknown>).aweme_list as Record<string, unknown>[])
          : []
      );

      return { total: allItems.length, videos: allItems.map(parseVideo) };
    },
  });

  site.command('profile', {
    description: '获取用户资料',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('用户主页 URL'),
    }),
    handler: async (params, ctx) => {
      const network = ctx.config.network as NetworkCapture;
      const page = ctx.page as import('playwright-core').Page;

      await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const captured = await network.waitFor(API.profile, 8000);
      if (!captured) throw new Error('未拦截到用户资料');

      const u = ((captured.body as Record<string, unknown>).user ?? {}) as Record<string, unknown>;
      return {
        uid: s(u.uid),
        nickname: s(u.nickname),
        signature: s(u.signature),
        followerCount: n(u.follower_count),
        followingCount: n(u.following_count),
        awemeCount: n(u.aweme_count),
      };
    },
  });

  site.command('detail', {
    description: '获取视频详情',
    scope: 'page',
    parameters: z.object({
      awemeId: z.string().describe('视频 ID'),
    }),
    handler: async (params, ctx) => {
      const network = ctx.config.network as NetworkCapture;
      const page = ctx.page as import('playwright-core').Page;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await page.waitForTimeout(3000);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        } else {
          await page.goto(`https://www.douyin.com/video/${params.awemeId}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
        }
        const captured = await network.waitFor(API.detail, 8000);
        if (!captured) continue;
        const body = captured.body as Record<string, unknown>;
        const awemeDetail = body.aweme_detail as Record<string, unknown> | null;
        if (awemeDetail) return parseVideo(awemeDetail);
      }
      throw new Error(`获取视频详情失败（可能被验证码拦截）: ${params.awemeId}`);
    },
  });

  site.command('comments', {
    description: '采集视频评论',
    scope: 'page',
    parameters: z.object({
      awemeId: z.string().describe('视频 ID'),
      maxPages: z.number().default(5).describe('最大翻页数'),
    }),
    handler: async (params, ctx) => {
      const network = ctx.config.network as NetworkCapture;
      const page = ctx.page as import('playwright-core').Page;

      await page.goto(`https://www.douyin.com/video/${params.awemeId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await scrollAndCollect(page, network, API.comments, params.maxPages, () =>
        page.evaluate(() => window.scrollBy(0, 500))
      );

      const commentData = network.filter(API.comments);
      const comments = commentData.flatMap((d) => {
        const body = d.body as Record<string, unknown>;
        return Array.isArray(body?.comments) ? body.comments : [];
      });

      return {
        total: comments.length,
        comments: comments.map((c: Record<string, unknown>) => {
          const cu = (c.user ?? {}) as Record<string, unknown>;
          return {
            cid: s(c.cid),
            text: s(c.text),
            diggCount: n(c.digg_count),
            user: { nickname: s(cu.nickname) },
          };
        }),
      };
    },
  });

  site.command('net-search', {
    description: '搜索已拦截的网络请求',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('目标网页 URL'),
      urlPattern: z.string().optional().describe('URL 匹配正则'),
      bodyField: z.string().optional().describe('响应体字段路径 (如 user.nickname)'),
      bodyValue: z.string().optional().describe('字段值匹配'),
      method: z.string().optional().describe('请求方法过滤'),
      showRequests: z.boolean().default(false).describe('显示请求参数'),
    }),
    handler: async (params, ctx) => {
      const network = ctx.config.network as NetworkCapture;
      const page = ctx.page as import('playwright-core').Page;

      await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const results = network.search({
        urlPattern: params.urlPattern ? new RegExp(params.urlPattern) : undefined,
        bodyField: params.bodyField,
        bodyValue: params.bodyValue,
        method: params.method,
      });

      return {
        total: results.length,
        items: results.slice(0, 50).map((r) => ({
          url: r.url,
          status: r.status,
          ...(params.showRequests
            ? { method: r.request.method, queryParams: r.request.queryParams }
            : {}),
          ...(params.bodyField
            ? { fieldValue: g(r.body, params.bodyField) }
            : { bodyPreview: JSON.stringify(r.body).slice(0, 200) }),
        })),
      };
    },
  });

  site.command('ai-summary', {
    description: '提取 AI 章节摘要',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('用户主页 URL'),
      awemeId: z.string().describe('视频 ID'),
    }),
    handler: async (params, ctx) => {
      const page = ctx.page as import('playwright-core').Page;
      const separator = params.url.includes('?') ? '&' : '?';
      await page.goto(`${params.url}${separator}modal_id=${params.awemeId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(6000);

      const data = await page.evaluate(() => {
        const modal = document.querySelector('.h1_b8gRO');
        if (!modal) return null;

        const summaryEl = modal.querySelector('.MpmPRgoY');
        const summary = summaryEl?.textContent?.trim() || '';

        const chapters: Array<{ time: string; title: string; content: string }> = [];
        const items = modal.querySelectorAll('.hFZ217ag');
        items.forEach((item) => {
          const raw = item.textContent || '';
          const m = raw.match(/^(\d{2}:\d{2})/);
          if (!m) return;
          const time = m[1];
          const title = raw.replace(/^\d{2}:\d{2}/, '').trim();
          const parent = item.closest('.npgJCnD2');
          const contentEl = parent?.querySelector('.qpDu5nGx');
          chapters.push({ time, title, content: contentEl?.textContent?.trim() || '' });
        });

        return { summary, chapters };
      });

      if (!data) throw new Error('未找到 AI 章节摘要');
      return { awemeId: params.awemeId, ...data };
    },
  });

  site.command('ai-search', {
    description: '通过 AI 搜索提取视频字幕总结',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('用户主页 URL'),
      awemeId: z.string().describe('视频 ID'),
      query: z.string().default('提取字幕总结').describe('搜索提问'),
    }),
    handler: async (params, ctx) => {
      const page = ctx.page as import('playwright-core').Page;
      const separator = params.url.includes('?') ? '&' : '?';
      await page.goto(`${params.url}${separator}modal_id=${params.awemeId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(6000);

      const video = page.locator('video').first();
      try {
        await video.click({ timeout: 3000 });
      } catch {}

      const aiBtn = page.locator('svg.wNbQukcA').first();
      await aiBtn.click({ timeout: 5000 });
      await page.waitForTimeout(5000);

      let aiFrame: import('playwright-core').Frame | null = null;
      for (const frame of page.frames()) {
        if (frame.url().includes('search_ai_mobile') || frame.url().includes('search_ai')) {
          try {
            await frame.waitForSelector('#ai-search-root', { timeout: 3000 });
            aiFrame = frame;
            break;
          } catch {
            continue;
          }
        }
      }
      if (!aiFrame) throw new Error('未找到 AI 搜索 iframe');

      const input = aiFrame.locator('#input_ai_search');
      await input.click({ timeout: 5000 });
      await input.fill(params.query);
      await input.press('Enter');
      await page.waitForTimeout(8000);

      const sections = await aiFrame.evaluate(() => {
        const result: Array<{
          summary: string;
          keyPoints: Array<{ title: string; content: string }>;
          timeline: Array<{ time: string; title: string; detail: string }>;
        }> = [];

        document.querySelectorAll('.flow-markdown-body').forEach((section) => {
          const summaryText: string[] = [];
          const keyPoints: Array<{ title: string; content: string }> = [];
          const timeline: Array<{ time: string; title: string; detail: string }> = [];
          let inTimeline = false;

          section.querySelectorAll(':scope > *').forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const text = el.textContent?.trim() || '';

            if (tag === 'h2' && text.includes('时间脉络')) {
              inTimeline = true;
              return;
            }

            if (inTimeline) {
              if (tag === 'ul' || tag === 'ol') {
                el.querySelectorAll('li').forEach((li) => {
                  const liText = li.textContent?.trim() || '';
                  const tm = liText.match(/(\d{4}\s*年|\d{1,2}\s*月\s*\d{1,2}\s*日?)/);
                  const strong = li.querySelector('strong')?.textContent?.trim() || '';
                  const detail = liText
                    .replace(strong, '')
                    .replace(/^\d{4}\s*年.?\d{1,2}\s*月.?\d{1,2}\s*日?/, '')
                    .trim();
                  timeline.push({ time: tm ? tm[1] : '', title: strong, detail });
                });
              }
            } else if (tag === 'ul' || tag === 'ol') {
              el.querySelectorAll('li').forEach((li) => {
                const strong = li.querySelector('strong')?.textContent?.trim() || '';
                const liText = li.textContent?.trim() || '';
                const content = liText
                  .replace(strong, '')
                  .replace(/^[:：]\s*/, '')
                  .trim();
                keyPoints.push({ title: strong, content });
              });
            } else if (text && tag !== 'button') {
              summaryText.push(text);
            }
          });

          if (keyPoints.length > 0 || timeline.length > 0) {
            result.push({ summary: summaryText.join('\n'), keyPoints, timeline });
          }
        });

        return result;
      });

      if (!sections || sections.length === 0) throw new Error('AI 搜索未返回结果');

      const section = sections.length > 1 ? sections[sections.length - 1] : sections[0];
      return {
        awemeId: params.awemeId,
        query: params.query,
        summary: section.summary,
        keyPoints: section.keyPoints,
        timeline: section.timeline,
      };
    },
  });
}
