#!/usr/bin/env node

import { chromium } from 'playwright';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
const VIDEO_ID = '12345';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function scrapeVideoPage() {
  const browser = await chromium.launch({
    executablePath: process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium'
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.error('Opening page...');
  await page.goto(`${BASE_URL}/examples/25-video-site.html?study`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const videoId = VIDEO_ID;

  console.error('Extracting video metadata from DOM...');
  const metadata = await page.evaluate((vid) => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
    const parseNum = (str) => parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;

    const statsSpans = document.querySelectorAll('.video-stats span');
    const videoStats = Array.from(statsSpans).map(s => s.textContent?.trim() || '');

    return {
      videoId: String(vid),
      title: getText('.video-title'),
      uploader: getText('.uploader-name'),
      views: parseNum(videoStats[0]),
      danmakuCount: parseNum(videoStats[1]),
      uploadTime: videoStats[2]?.replace('📅 ', '').trim() || '',
      likes: parseNum(videoStats[3]),
      coins: parseNum(videoStats[4]),
      favorites: parseNum(videoStats[5]),
      shares: parseNum(videoStats[6]),
      description: getText('.video-description'),
      recommended: Array.from(document.querySelectorAll('.recommended-card')).map(v => ({
        title: v.querySelector('.recommended-title')?.textContent?.trim() || '',
        uploader: v.querySelector('.recommended-meta')?.textContent?.split(' · ')[0]?.trim() || '',
        views: v.querySelector('.recommended-meta')?.textContent?.split(' · ')[1]?.trim() || '',
        duration: v.querySelector('.recommended-duration')?.textContent?.trim() || ''
      }))
    };
  }, videoId);

  console.error('Fetching video info from API...');
  let videoInfo = { videoId: VIDEO_ID };
  try {
    videoInfo = await fetchJSON(`${BASE_URL}/examples/25/video/${VIDEO_ID}`);
  } catch (e) {
    console.error('Video API failed:', e.message);
  }

  console.error('Fetching danmaku from API...');
  const danmakuSet = new Set();
  const danmaku = [];
  let danmakuPage = 1;
  while (true) {
    try {
      const res = await fetchJSON(`${BASE_URL}/examples/25/danmaku/${VIDEO_ID}?page=${danmakuPage}`);
      if (!res || res.length === 0) break;
      for (const d of res) {
        const key = `${d.time}-${d.text}`;
        if (!danmakuSet.has(key)) {
          danmakuSet.add(key);
          danmaku.push(d);
        }
      }
      danmakuPage++;
      if (danmakuPage > 10) break;
    } catch {
      break;
    }
  }

  console.error('Fetching comments from API...');
  const commentSet = new Set();
  const comments = [];
  let commentPage = 1;
  while (true) {
    try {
      const res = await fetchJSON(`${BASE_URL}/examples/25/comments/${VIDEO_ID}?page=${commentPage}`);
      if (!res || res.length === 0) break;
      for (const c of res) {
        const key = `${c.user}-${c.content}`;
        if (!commentSet.has(key)) {
          commentSet.add(key);
          comments.push(c);
        }
      }
      commentPage++;
      if (commentPage > 10) break;
    } catch {
      break;
    }
  }

  const result = {
    ...metadata,
    ...videoInfo,
    danmaku,
    comments,
  };

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

scrapeVideoPage().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});