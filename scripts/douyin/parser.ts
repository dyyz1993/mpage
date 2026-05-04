import type { Response } from 'playwright-core';
import type { DouyinVideo, DouyinUserProfile, DouyinComment } from './types.js';

const API_PATTERNS = {
  userPosts: /\/aweme\/v1\/web\/aweme\/post\//,
  videoDetail: /\/aweme\/v1\/web\/aweme\/detail\//,
  comments: /\/aweme\/v1\/web\/comment\/list\//,
  commentReplies: /\/aweme\/v1\/web\/comment\/list\/reply\//,
  userProfile: /\/aweme\/v1\/web\/user\/profile\/other\//,
};

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function safeGet(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function firstUrl(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return '';
  const urls = safeGet(addr, 'url_list');
  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
    return urls[0];
  }
  return '';
}

export function parseAwemeItem(item: Record<string, unknown>): DouyinVideo {
  const statistics = (item.statistics ?? {}) as Record<string, unknown>;
  const video = (item.video ?? {}) as Record<string, unknown>;
  const author = (item.author ?? {}) as Record<string, unknown>;
  const music = (item.music ?? {}) as Record<string, unknown>;
  const textExtra = Array.isArray(item.text_extra) ? item.text_extra : [];
  const tagNames = textExtra
    .map((t: unknown) => safeGet(t, 'hashtag_name'))
    .filter((n): n is string => typeof n === 'string');

  const createTime = typeof item.create_time === 'number' ? item.create_time : 0;

  return {
    awemeId: String(item.aweme_id ?? ''),
    desc: String(item.desc ?? ''),
    createTime,
    createTimeStr: formatTimestamp(createTime),
    author: {
      uid: String(author.uid ?? ''),
      secUid: String(author.sec_uid ?? ''),
      nickname: String(author.nickname ?? ''),
      avatar: firstUrl(author.avatar_thumb),
      signature: String(author.signature ?? ''),
    },
    video: {
      playUrl: firstUrl(video.play_addr),
      downloadUrl: firstUrl(video.download_addr),
      cover: firstUrl(video.cover),
      dynamicCover: firstUrl(video.dynamic_cover),
      width: Number(video.width ?? 0),
      height: Number(video.height ?? 0),
      duration: Number(video.duration ?? 0),
      ratio: String(video.ratio ?? ''),
    },
    music: {
      id: String(music.id ?? ''),
      title: String(music.title ?? ''),
      author: String(music.author ?? ''),
      playUrl: firstUrl(music.play_url),
      cover: firstUrl(music.cover_thumb),
    },
    statistics: {
      diggCount: Number(statistics.digg_count ?? 0),
      commentCount: Number(statistics.comment_count ?? 0),
      shareCount: Number(statistics.share_count ?? 0),
      forwardCount: Number(statistics.forward_count ?? 0),
      collectCount: Number(statistics.collect_count ?? 0),
      playCount: Number(statistics.play_count ?? 0),
    },
    awemeType: Number(item.aweme_type ?? 0),
    tagNames,
  };
}

export function parseUserProfile(data: Record<string, unknown>): DouyinUserProfile {
  const user = (data.user ?? {}) as Record<string, unknown>;
  return {
    uid: String(user.uid ?? ''),
    secUid: String(user.sec_uid ?? ''),
    nickname: String(user.nickname ?? ''),
    avatar: firstUrl(user.avatar_thumb),
    signature: String(user.signature ?? ''),
    followerCount: Number(user.follower_count ?? 0),
    followingCount: Number(user.following_count ?? 0),
    awemeCount: Number(user.aweme_count ?? 0),
    favoritingCount: Number(user.favoriting_count ?? 0),
    totalCount: Number(user.total_favorited ?? 0),
    uniqueId: String(user.unique_id ?? ''),
  };
}

export function parseComment(data: Record<string, unknown>): DouyinComment {
  const user = (data.user ?? {}) as Record<string, unknown>;
  const createTime = typeof data.create_time === 'number' ? data.create_time : 0;
  const replyPreview = Array.isArray(data.reply_comment)
    ? data.reply_comment.map((r: unknown) => parseComment(r as Record<string, unknown>))
    : [];

  return {
    cid: String(data.cid ?? ''),
    awemeId: String(data.aweme_id ?? ''),
    text: String(data.text ?? ''),
    createTime,
    createTimeStr: formatTimestamp(createTime),
    diggCount: Number(data.digg_count ?? 0),
    replyCount: Number(data.reply_comment_total ?? 0),
    user: {
      uid: String(user.uid ?? ''),
      secUid: String(user.sec_uid ?? ''),
      nickname: String(user.nickname ?? ''),
      avatar: firstUrl(user.avatar_thumb),
    },
    replyPreview,
  };
}

export interface InterceptedData {
  videos: DouyinVideo[];
  profile: DouyinUserProfile | null;
  comments: DouyinComment[];
  hasMore: boolean;
  maxCursor: number;
}

export class NetworkInterceptor {
  private collectedVideos: DouyinVideo[] = [];
  private profile: DouyinUserProfile | null = null;
  private collectedComments: DouyinComment[] = [];
  private hasMore = false;
  private maxCursor = 0;

  getHandler() {
    return async (response: Response) => {
      const url = response.url();

      try {
        if (API_PATTERNS.userPosts.test(url)) {
          const json = await response.json();
          const data = json as Record<string, unknown>;
          const awemeList = Array.isArray(data.aweme_list) ? data.aweme_list : [];

          for (const item of awemeList) {
            this.collectedVideos.push(parseAwemeItem(item as Record<string, unknown>));
          }

          this.hasMore = Boolean(data.has_more);
          this.maxCursor = Number(data.max_cursor ?? 0);
        }

        if (API_PATTERNS.videoDetail.test(url)) {
          const json = await response.json();
          const data = json as Record<string, unknown>;
          const awemeDetail = data.aweme_detail as Record<string, unknown> | undefined;
          if (awemeDetail) {
            this.collectedVideos.push(parseAwemeItem(awemeDetail));
          }
        }

        if (API_PATTERNS.userProfile.test(url)) {
          const json = await response.json();
          const data = json as Record<string, unknown>;
          this.profile = parseUserProfile(data);
        }

        if (API_PATTERNS.comments.test(url)) {
          const json = await response.json();
          const data = json as Record<string, unknown>;
          const comments = Array.isArray(data.comments) ? data.comments : [];
          for (const c of comments) {
            this.collectedComments.push(parseComment(c as Record<string, unknown>));
          }
        }
      } catch {
        // ignore non-JSON responses or parse errors
      }
    };
  }

  getResults(): InterceptedData {
    return {
      videos: [...this.collectedVideos],
      profile: this.profile,
      comments: [...this.collectedComments],
      hasMore: this.hasMore,
      maxCursor: this.maxCursor,
    };
  }

  reset(): void {
    this.collectedVideos = [];
    this.profile = null;
    this.collectedComments = [];
    this.hasMore = false;
    this.maxCursor = 0;
  }
}
