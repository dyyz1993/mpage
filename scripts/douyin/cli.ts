import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DouyinCollector } from './collector.js';
import type { DouyinVideo, DouyinUserProfile, DouyinComment } from './types.js';

const rawArgs = process.argv.slice(2);
const cleanArgs: string[] = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '-o' || a === '--output' || a === '--output-dir') {
    i++;
    continue;
  }
  if (a.startsWith('-o=') || a.startsWith('--output=')) {
    continue;
  }
  if (a === '-q' || a === '--quiet') {
    continue;
  }
  cleanArgs.push(a);
}
const cmd = cleanArgs[0];
const target = cleanArgs[1];
const restArgs = cleanArgs.slice(2);

function getFlag(name: string, fallback?: string): string | undefined {
  const idx = rawArgs.indexOf(`--${name}`);
  if (idx !== -1 && rawArgs[idx + 1]) return rawArgs[idx + 1];
  const shortIdx = rawArgs.indexOf(`-${name[0]}`);
  if (shortIdx !== -1 && rawArgs[shortIdx + 1]) return rawArgs[shortIdx + 1];
  const eqIdx = rawArgs.findIndex((a) => a.startsWith(`--${name}=`));
  if (eqIdx !== -1) return rawArgs[eqIdx].split('=')[1];
  const shortEqIdx = rawArgs.findIndex((a) => a.startsWith(`-${name[0]}=`));
  if (shortEqIdx !== -1) return rawArgs[shortEqIdx].split('=')[1];
  return fallback;
}

function hasFlag(name: string): boolean {
  return rawArgs.includes(`--${name}`) || rawArgs.includes(`-${name[0]}`);
}

const outputDir = getFlag('output-dir', 'output');
const outputFile = getFlag('output', getFlag('o'));
const quiet = hasFlag('quiet') || hasFlag('q');

function ensureDir(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true });
  } catch {}
}

function saveJson(data: unknown, filename: string): string {
  ensureDir(outputDir);
  const path = outputFile ?? join(outputDir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  return path;
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function printVideo(v: DouyinVideo, i?: number): void {
  if (quiet) return;
  const p = i !== undefined ? `[${i + 1}] ` : '';
  console.log(`${p}${v.desc.slice(0, 60)}`);
  console.log(`    ID: ${v.awemeId} | 发布: ${v.createTimeStr}`);
  console.log(
    `    点赞:${fmt(v.statistics.diggCount)} 评论:${fmt(v.statistics.commentCount)} 转发:${fmt(v.statistics.shareCount)} 收藏:${fmt(v.statistics.collectCount)}`
  );
  console.log(`    视频: ${v.video.playUrl.slice(0, 80)}`);
  console.log(`    音乐: ${v.music.title} - ${v.music.author}`);
  console.log(`    音频: ${v.music.playUrl.slice(0, 80)}`);
  console.log(
    `    时长:${(v.video.duration / 1000).toFixed(1)}s | ${v.video.width}x${v.video.height} | 标签:[${v.tagNames.join(',') || '-'}]\n`
  );
}

function printProfile(p: DouyinUserProfile): void {
  if (quiet) return;
  console.log('=== 用户资料 ===');
  console.log(`${p.nickname} (@${p.uniqueId || p.uid})`);
  console.log(`签名: ${p.signature}`);
  console.log(
    `粉丝:${fmt(p.followerCount)} 关注:${fmt(p.followingCount)} 作品:${p.awemeCount} 获赞:${fmt(p.totalCount)}\n`
  );
}

function printComment(c: DouyinComment): void {
  if (quiet) return;
  console.log(`@${c.user.nickname}: ${c.text}`);
  console.log(`  ${c.createTimeStr} | 赞:${c.diggCount} | 回复:${c.replyCount}\n`);
}

function help(): void {
  console.log(`
抖音采集工具 (CDP 模式)

用法:
  npx tsx scripts/douyin/cli.ts <命令> <参数> [选项]

命令:
  launch                启动浏览器并输出 CDP 地址
  connect <cdpUrl>      连接已有浏览器
  user-videos <url>     采集用户作品列表
  user-profile <url>    获取用户资料
  video-detail <id>     获取视频详情 (ID 或 URL)
  video-comments <id>   采集视频评论
  ai-search-summary <url> <awemeId> [query]  通过 AI 搜索提取视频字幕总结
  net-search <keyword>  搜索已拦截的网络请求

选项:
  -o, --output <file>      输出文件路径 (默认 output/<命令>.json)
  --output-dir <dir>       输出目录 (默认 output/)
  -q, --quiet              静默模式，只输出文件路径

环境变量:
  CDP_URL               CDP 连接地址

示例:
  # 启动浏览器
  npx tsx scripts/douyin/cli.ts launch

  # 连接并采集，保存到默认路径
  CDP_URL=ws://localhost:9221/devtools/browser/xxx \\
    npx tsx scripts/douyin/cli.ts user-videos "https://www.douyin.com/user/MS4wLjAB..."

  # 指定输出文件
  CDP_URL=ws://... npx tsx scripts/douyin/cli.ts -o result.json user-videos <url>

  # 单视频详情 + 评论
  CDP_URL=ws://... npx tsx scripts/douyin/cli.ts video-detail 763547278605758570
  CDP_URL=ws://... npx tsx scripts/douyin/cli.ts video-comments 763547278605758570
`);
}

async function main(): Promise<void> {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    help();
    return;
  }

  const collector = new DouyinCollector();
  const cdpEnv = process.env.CDP_URL;

  try {
    if (cmd === 'launch') {
      const url = await collector.launch();
      console.log(`\n浏览器已启动! CDP: ${url}`);
      console.log('请在浏览器中完成登录/验证\n');
      await new Promise(() => {});
      return;
    }

    const cdp = target?.startsWith('ws://') ? target : cdpEnv;
    if (!cdp) {
      console.error('Error: 需要提供 CDP 地址');
      console.error('用法: npx tsx scripts/douyin/cli.ts connect <cdp-url>');
      console.error('或设置环境变量: CDP_URL=ws://...');
      process.exit(1);
    }

    if (!quiet) console.log(`连接 CDP: ${cdp}`);
    await collector.connect(cdp);
    if (!quiet) console.log('OK\n');

    const arg = target?.startsWith('ws://') ? restArgs[0] : target;

    switch (cmd) {
      case 'connect':
        console.log('已就绪.');
        console.log(`CDP_URL=${cdp} npx tsx scripts/douyin/cli.ts user-videos <url>`);
        break;

      case 'user-videos': {
        if (!arg) throw new Error('缺少用户主页 URL');
        const maxPages = parseInt(restArgs.find((r) => /^\d+$/.test(r)) ?? '5', 10);
        if (!quiet) console.log(`采集用户作品 (最多${maxPages}页)...`);
        const videos = await collector.getUserVideos(arg, maxPages);
        const path = saveJson(
          {
            url: arg,
            collectedAt: new Date().toISOString(),
            total: videos.length,
            videos,
          },
          `videos-${Date.now()}.json`
        );
        if (!quiet) {
          console.log(`\n共 ${videos.length} 个作品:\n`);
          videos.forEach((v, i) => printVideo(v, i));
        }
        console.log(`=> ${path}`);
        break;
      }

      case 'user-profile': {
        if (!arg) throw new Error('缺少用户主页 URL');
        if (!quiet) console.log('获取用户资料...');
        const profile = await collector.getUserProfile(arg);
        const path = saveJson(
          { url: arg, collectedAt: new Date().toISOString(), ...profile },
          `profile.json`
        );
        printProfile(profile);
        console.log(`=> ${path}`);
        break;
      }

      case 'video-detail': {
        if (!arg) throw new Error('缺少视频 ID 或 URL');
        const id = arg.match(/\/video\/(\d+)/)?.[1] ?? arg;
        if (!quiet) console.log(`获取视频详情 (${id})...`);
        const video = await collector.getVideoDetail(id);
        const path = saveJson(
          { awemeId: id, collectedAt: new Date().toISOString(), ...video },
          `detail-${id}.json`
        );
        printVideo(video);
        console.log(`=> ${path}`);
        break;
      }

      case 'video-comments': {
        if (!arg) throw new Error('缺少视频 ID 或 URL');
        const id = arg.match(/\/video\/(\d+)/)?.[1] ?? arg;
        const maxPages = parseInt(restArgs.find((r) => /^\d+$/.test(r)) ?? '5', 10);
        if (!quiet) console.log(`采集评论 (${id})...`);
        const comments = await collector.getVideoComments(id, maxPages);
        const path = saveJson(
          { awemeId: id, collectedAt: new Date().toISOString(), total: comments.length, comments },
          `comments-${id}.json`
        );
        if (!quiet) {
          console.log(`\n共 ${comments.length} 条评论:\n`);
          comments.forEach(printComment);
        }
        console.log(`=> ${path}`);
        break;
      }

      case 'net-search': {
        if (!arg) throw new Error('缺少搜索关键词');
        const net = collector.getNetCapture();
        const results = net.searchUrl(arg);
        const path = saveJson(
          { keyword: arg, count: results.length, results },
          `net-${arg.replace(/\W+/g, '-')}.json`
        );
        results.forEach((r) => console.log(`  [${r.status}] ${r.method} ${r.url.slice(0, 120)}`));
        console.log(`\n共 ${results.length} 条 => ${path}`);
        break;
      }

      case 'ai-search-summary': {
        if (!arg) throw new Error('缺少用户主页 URL');
        const awemeId = restArgs[0];
        if (!awemeId) throw new Error('缺少视频 ID');
        const query = restArgs[1] || '提取字幕总结';
        if (!quiet) console.log(`AI 搜索提取 (${awemeId}): "${query}"...`);
        const result = await collector.extractAiSearchSummary(arg, awemeId, query);
        if (!result) throw new Error('AI 搜索未返回结果');
        const path = saveJson(
          { collectedAt: new Date().toISOString(), ...result },
          `ai-search-${awemeId}.json`
        );
        if (!quiet) {
          console.log(`\n摘要: ${result.summary}\n`);
          result.keyPoints.forEach((kp) => console.log(`  • ${kp.title}: ${kp.content}`));
          if (result.timeline.length) {
            console.log('\n时间脉络:');
            result.timeline.forEach((tl) =>
              console.log(`  [${tl.time}] ${tl.title} - ${tl.detail}`)
            );
          }
          console.log();
        }
        console.log(`=> ${path}`);
        break;
      }

      default:
        console.error(`未知命令: ${cmd}`);
        help();
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    if (cmd !== 'launch' && cmd !== 'connect') await collector.close();
  }
}

main();
