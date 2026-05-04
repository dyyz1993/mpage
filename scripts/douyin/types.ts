export interface DouyinVideo {
  awemeId: string;
  desc: string;
  createTime: number;
  createTimeStr: string;
  author: {
    uid: string;
    secUid: string;
    nickname: string;
    avatar: string;
    signature: string;
  };
  video: {
    playUrl: string;
    downloadUrl: string;
    cover: string;
    dynamicCover: string;
    width: number;
    height: number;
    duration: number;
    ratio: string;
  };
  music: {
    id: string;
    title: string;
    author: string;
    playUrl: string;
    cover: string;
  };
  statistics: {
    diggCount: number;
    commentCount: number;
    shareCount: number;
    forwardCount: number;
    collectCount: number;
    playCount: number;
  };
  awemeType: number;
  tagNames: string[];
}

export interface DouyinUserProfile {
  uid: string;
  secUid: string;
  nickname: string;
  avatar: string;
  signature: string;
  followerCount: number;
  followingCount: number;
  awemeCount: number;
  favoritingCount: number;
  totalCount: number;
  uniqueId: string;
}

export interface DouyinComment {
  cid: string;
  awemeId: string;
  text: string;
  createTime: number;
  createTimeStr: string;
  diggCount: number;
  replyCount: number;
  user: {
    uid: string;
    secUid: string;
    nickname: string;
    avatar: string;
  };
  replyPreview: DouyinComment[];
}

export interface DouyinSubtitle {
  awemeId: string;
  subtitles: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  fullText: string;
}

export interface DouyinAiSummary {
  awemeId: string;
  summary: string;
  chapters: Array<{
    time: string;
    title: string;
    content: string;
  }>;
  fullText: string;
}

export interface DouyinAiSearchSummary {
  awemeId: string;
  query: string;
  summary: string;
  keyPoints: Array<{
    title: string;
    content: string;
  }>;
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
  }>;
  fullText: string;
}
