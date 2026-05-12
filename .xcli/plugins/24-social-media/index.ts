import { z } from 'zod/v4';
import type { XCLIAPI, CommandContext } from '@dyyz1993/xcli-core';
import { crawlerUrl } from '../_shared';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
const TARGET_URL = `${BASE_URL}/examples/24-social-media.html`;

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '24-social-media',
    url: crawlerUrl('24-social-media'),
  });

  plugin.command('scrape', {
    description: '采集社交媒体推文',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      await ctx.page.goto(TARGET_URL);
      await ctx.page.waitForLoadState('domcontentloaded');

      await expandAllContent(ctx);
      await scrollToLoadAll(ctx);

      const tweets = await extractTweets(ctx);

      return {
        data: tweets,
        tips: [`采集到 ${tweets.length} 条推文`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验推文数据',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      await ctx.page.goto(TARGET_URL);
      await ctx.page.waitForLoadState('domcontentloaded');

      await expandAllContent(ctx);
      await scrollToLoadAll(ctx);

      const tweets = await extractTweets(ctx);
      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (tweets.length === 0) {
        errors.push({ field: 'tweets', expected: '> 0', actual: '0' });
      }

      for (const tweet of tweets.slice(0, 3)) {
        if (!tweet.id) {
          errors.push({ field: 'id', expected: 'string', actual: 'undefined' });
        }
        if (!tweet.author_name) {
          errors.push({ field: 'author_name', expected: 'string', actual: 'undefined' });
        }
        if (!tweet.content) {
          errors.push({ field: 'content', expected: 'string', actual: 'undefined' });
        }
      }

      return {
        data: tweets,
        errors,
        tips: errors.length === 0 ? ['校验通过'] : [`发现 ${errors.length} 个问题`],
      };
    },
  });
}

async function expandAllContent(ctx: CommandContext) {
  const expandButtons = await ctx.page.locator('text=/展开|展开全文|Read more/').all();
  for (const btn of expandButtons) {
    try {
      await btn.click({ timeout: 1000 });
      await ctx.page.waitForTimeout(300);
    } catch {}
  }
}

async function scrollToLoadAll(ctx: CommandContext) {
  let prevHeight = 0;
  let sameCount = 0;
  const maxScrolls = 10;

  for (let i = 0; i < maxScrolls; i++) {
    await ctx.page.evaluate(() => {
      const area = document.querySelector('.simulation-area');
      if (area) {
        area.scrollTop = area.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    await ctx.page.waitForTimeout(500);

    const newHeight = await ctx.page.evaluate(() => {
      const area = document.querySelector('.simulation-area');
      return area ? area.scrollHeight : document.body.scrollHeight;
    });

    if (newHeight === prevHeight) {
      sameCount++;
      if (sameCount >= 2) break;
    } else {
      sameCount = 0;
    }
    prevHeight = newHeight;
  }
}

async function extractTweets(ctx: CommandContext) {
  return await ctx.page.evaluate(() => {
    const tweets: Record<string, unknown>[] = [];
    const tweetElements = document.querySelectorAll('.tweet');

    tweetElements.forEach((tweet) => {
      const id = tweet.getAttribute('data-id') || tweet.id || '';

      const avatarEl = tweet.querySelector('.tweet-avatar');
      const avatar = avatarEl?.innerHTML || avatarEl?.getAttribute('src') || '';

      const nameEl = tweet.querySelector('.tweet-name');
      const authorName = nameEl?.textContent?.trim() || '';

      const usernameEl = tweet.querySelector('.tweet-username');
      const username = usernameEl?.textContent?.trim() || '';

      const timeEl = tweet.querySelector('.tweet-time');
      const time = timeEl?.textContent?.trim() || '';

      const contentEl = tweet.querySelector('.tweet-content');
      const content = contentEl?.textContent?.trim() || '';

      const repostsEl = tweet.querySelector('.tweet-action:nth-child(1) .count, .retweet .count');
      const reposts = parseInt(repostsEl?.textContent?.trim() || '0') || 0;

      const commentsEl = tweet.querySelector('.tweet-action:nth-child(2) .count, .comment .count');
      const comments = parseInt(commentsEl?.textContent?.trim() || '0') || 0;

      const likesEl = tweet.querySelector('.tweet-action:nth-child(3) .count, .like .count');
      const likes = parseInt(likesEl?.textContent?.trim() || '0') || 0;

      const commentsList: Record<string, unknown>[] = [];
      const commentEls = tweet.querySelectorAll('.comment');
      commentEls.forEach((c) => {
        const cAuthor = c.querySelector('.comment-avatar')?.textContent?.trim() || '匿名';
        const cContent = c.querySelector('.comment-content')?.textContent?.trim() || '';
        const cTime = c.querySelector('.comment-time')?.textContent?.trim() || '';
        if (cContent) {
          commentsList.push({ author: cAuthor, content: cContent, time: cTime });
        }
      });

      tweets.push({
        id,
        author_name: authorName,
        username,
        avatar,
        content,
        time,
        reposts,
        comments,
        likes,
        comments_list: commentsList,
      });
    });

    return tweets;
  });
}
