import type { Page, Frame } from 'playwright-core';
import { launchBrowser, connectCdp, closeSession, type BrowserSession } from './browser.js';
import { NetCapture } from './net.js';
import type {
  DouyinVideo,
  DouyinUserProfile,
  DouyinComment,
  DouyinAiSummary,
  DouyinAiSearchSummary,
} from './types.js';

const API = {
  posts: /\/aweme\/v1\/web\/aweme\/post\//,
  detail: /\/aweme\/v1\/web\/aweme\/detail\//,
  comments: /\/aweme\/v1\/web\/comment\/list\//,
  profile: /\/aweme\/v1\/web\/user\/profile\/other\//,
};

function ts(n: number): string {
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 19);
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

function n(v: unknown): number {
  return Number(v ?? 0);
}

function s(v: unknown): string {
  return String(v ?? '');
}

export class DouyinCollector {
  private session: BrowserSession | null = null;
  private net: NetCapture;

  constructor() {
    this.net = new NetCapture();
  }

  async launch(): Promise<string> {
    this.session = await launchBrowser();
    this.session.page.on('response', (res) => {
      this.net.on(res);
      if (/aweme|comment|user\/profile/.test(res.url())) {
        this.net.captureJson(res);
      }
    });
    return this.session.cdpUrl;
  }

  async connect(cdpUrl: string): Promise<void> {
    this.session = await connectCdp(cdpUrl);
    this.session.page.on('response', (res) => {
      this.net.on(res);
      if (/aweme|comment|user\/profile/.test(res.url())) {
        this.net.captureJson(res);
      }
    });
  }

  get page(): Page | null {
    return this.session?.page ?? null;
  }

  private parseVideo(item: Record<string, unknown>): DouyinVideo {
    const ct = n(item.create_time);
    const stats = (item.statistics ?? {}) as Record<string, unknown>;
    const vid = (item.video ?? {}) as Record<string, unknown>;
    const auth = (item.author ?? {}) as Record<string, unknown>;
    const mus = (item.music ?? {}) as Record<string, unknown>;
    const tags = Array.isArray(item.text_extra)
      ? item.text_extra.map((t: unknown) => s(g(t, 'hashtag_name'))).filter(Boolean)
      : [];

    return {
      awemeId: s(item.aweme_id),
      desc: s(item.desc),
      createTime: ct,
      createTimeStr: ts(ct),
      author: {
        uid: s(auth.uid),
        secUid: s(auth.sec_uid),
        nickname: s(auth.nickname),
        avatar: firstUrl(auth.avatar_thumb),
        signature: s(auth.signature),
      },
      video: {
        playUrl: firstUrl(vid.play_addr),
        downloadUrl: firstUrl(vid.download_addr),
        cover: firstUrl(vid.cover),
        dynamicCover: firstUrl(vid.dynamic_cover),
        width: n(vid.width),
        height: n(vid.height),
        duration: n(vid.duration),
        ratio: s(vid.ratio),
      },
      music: {
        id: s(mus.id),
        title: s(mus.title),
        author: s(mus.author),
        playUrl: firstUrl(mus.play_url),
        cover: firstUrl(mus.cover_thumb),
      },
      statistics: {
        diggCount: n(stats.digg_count),
        commentCount: n(stats.comment_count),
        shareCount: n(stats.share_count),
        forwardCount: n(stats.forward_count),
        collectCount: n(stats.collect_count),
        playCount: n(stats.play_count),
      },
      awemeType: n(item.aweme_type),
      tagNames: tags,
    };
  }

  async getUserVideos(userUrl: string, maxPages = 5): Promise<DouyinVideo[]> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    this.net.clear();
    await p.goto(userUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3000);

    for (let i = 0; i < maxPages; i++) {
      const prev = this.net.getJson(API.posts).length;
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(2000);

      const list = this.net.getJson<Record<string, unknown>>(API.posts);
      if (list.length > 0 && !list[0].has_more) break;
      if (list.length === prev && i > 0) break;
    }

    const rawList = this.net.getJson<Record<string, unknown>>(API.posts);
    const allItems = rawList.flatMap((d) => (Array.isArray(d.aweme_list) ? d.aweme_list : []));
    return allItems.map((item) => this.parseVideo(item));
  }

  async getUserProfile(userUrl: string): Promise<DouyinUserProfile> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    this.net.clear();
    await p.goto(userUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3000);

    const data = this.net.getLatest(API.profile)?.body as Record<string, unknown> | undefined;
    if (!data) throw new Error('未拦截到用户资料');

    const u = (data.user ?? {}) as Record<string, unknown>;
    return {
      uid: s(u.uid),
      secUid: s(u.sec_uid),
      nickname: s(u.nickname),
      avatar: firstUrl(u.avatar_thumb),
      signature: s(u.signature),
      followerCount: n(u.follower_count),
      followingCount: n(u.following_count),
      awemeCount: n(u.aweme_count),
      favoritingCount: n(u.favoriting_count),
      totalCount: n(u.total_favorited),
      uniqueId: s(u.unique_id),
    };
  }

  async getVideoDetail(awemeId: string): Promise<DouyinVideo> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    this.net.clear();
    await p.goto(`https://www.douyin.com/video/${awemeId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await p.waitForTimeout(3000);

    const detailData = this.net.getJson<Record<string, unknown>>(API.detail);
    const item =
      detailData.find((d) => s(d.aweme_detail?.aweme_id) === awemeId) ??
      (detailData[0]?.aweme_detail as Record<string, unknown>);

    if (!item) throw new Error(`未拦截到视频详情: ${awemeId}`);
    return this.parseVideo(item);
  }

  async getVideoComments(awemeId: string, maxPages = 5): Promise<DouyinComment[]> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    this.net.clear();
    await p.goto(`https://www.douyin.com/video/${awemeId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await p.waitForTimeout(3000);

    for (let i = 0; i < maxPages; i++) {
      const prev = this.net.getJson(API.comments).length;
      await p.evaluate(() => window.scrollBy(0, 500));
      await p.waitForTimeout(1500);
      if (this.net.getJson(API.comments).length === prev && i > 0) break;
    }

    const commentData = this.net.getJson<Record<string, unknown>>(API.comments);
    return commentData
      .flatMap((d) => (Array.isArray(d.comments) ? d.comments : []))
      .map((c) => {
        const cu = (c.user ?? {}) as Record<string, unknown>;
        const ct = n(c.create_time);
        return {
          cid: s(c.cid),
          awemeId: s(c.aweme_id),
          text: s(c.text),
          createTime: ct,
          createTimeStr: ts(ct),
          diggCount: n(c.digg_count),
          replyCount: n(c.reply_comment_total),
          user: {
            uid: s(cu.uid),
            secUid: s(cu.sec_uid),
            nickname: s(cu.nickname),
            avatar: firstUrl(cu.avatar_thumb),
          },
          replyPreview: [],
        };
      });
  }

  async extractAiSummary(userUrl: string, awemeId: string): Promise<DouyinAiSummary | null> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    const separator = userUrl.includes('?') ? '&' : '?';
    await p.goto(`${userUrl}${separator}modal_id=${awemeId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await p.waitForTimeout(6000);

    const data = await p.evaluate(() => {
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

      const fullText = [
        summary,
        ...chapters.map((c) => `[${c.time}] ${c.title}: ${c.content}`),
      ].join('\n');
      return { summary, chapters, fullText };
    });

    if (!data) return null;
    return { awemeId, ...data };
  }

  private async findAiFrame(page: Page): Promise<Frame | null> {
    for (const frame of page.frames()) {
      if (frame.url().includes('search_ai_mobile') || frame.url().includes('search_ai')) {
        try {
          await frame.waitForSelector('#ai-search-root', { timeout: 3000 });
          return frame;
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  async extractAiSearchSummary(
    userUrl: string,
    awemeId: string,
    query = '提取字幕总结'
  ): Promise<DouyinAiSearchSummary | null> {
    const p = this.page;
    if (!p) throw new Error('未连接浏览器');

    const separator = userUrl.includes('?') ? '&' : '?';
    await p.goto(`${userUrl}${separator}modal_id=${awemeId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await p.waitForTimeout(6000);

    const video = p.locator('video').first();
    try {
      await video.click({ timeout: 3000 });
    } catch {}

    const aiBtn = p.locator('svg.wNbQukcA').first();
    await aiBtn.click({ timeout: 5000 });
    await p.waitForTimeout(5000);

    const frame = await this.findAiFrame(p);
    if (!frame) throw new Error('未找到 AI 搜索 iframe');

    const input = frame.locator('#input_ai_search');
    await input.click({ timeout: 5000 });
    await input.fill(query);
    await input.press('Enter');
    await p.waitForTimeout(8000);

    const data = await frame.evaluate(() => {
      const sections = document.querySelectorAll('.flow-markdown-body');
      const result: Array<{
        summary: string;
        keyPoints: Array<{ title: string; content: string }>;
        timeline: Array<{ time: string; title: string; detail: string }>;
      }> = [];

      sections.forEach((section) => {
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
                timeline.push({
                  time: tm ? tm[1] : '',
                  title: strong,
                  detail,
                });
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
          result.push({
            summary: summaryText.join('\n'),
            keyPoints,
            timeline,
          });
        }
      });

      return result;
    });

    if (!data || data.length === 0) return null;

    const section = data.length > 1 ? data[data.length - 1] : data[0];

    const fullText = [
      section.summary,
      ...section.keyPoints.map((kp) => `${kp.title}: ${kp.content}`),
      ...section.timeline.map((tl) => `[${tl.time}] ${tl.title} ${tl.detail}`),
    ]
      .filter(Boolean)
      .join('\n');

    return {
      awemeId,
      query,
      summary: section.summary,
      keyPoints: section.keyPoints,
      timeline: section.timeline,
      fullText,
    };
  }

  getNetCapture(): NetCapture {
    return this.net;
  }

  async close(): Promise<void> {
    if (this.session) await closeSession(this.session);
    this.session = null;
  }
}
