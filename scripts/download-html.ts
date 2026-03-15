import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const websites = [
  { name: 'google', url: 'https://www.google.com', category: 'search' },
  { name: 'baidu', url: 'https://www.baidu.com', category: 'search' },
  { name: 'bing', url: 'https://www.bing.com', category: 'search' },
  { name: 'github', url: 'https://github.com', category: 'tech' },
  { name: 'stackoverflow', url: 'https://stackoverflow.com', category: 'tech' },
  { name: 'npm', url: 'https://www.npmjs.com', category: 'tech' },
  { name: 'mdn', url: 'https://developer.mozilla.org', category: 'tech' },
  { name: 'zhihu', url: 'https://www.zhihu.com', category: 'social' },
  { name: 'weibo', url: 'https://weibo.com', category: 'social' },
  { name: 'xiaohongshu', url: 'https://www.xiaohongshu.com', category: 'social' },
  { name: 'bilibili', url: 'https://www.bilibili.com', category: 'video' },
  { name: 'youtube', url: 'https://www.youtube.com', category: 'video' },
  { name: 'douyin', url: 'https://www.douyin.com', category: 'video' },
  { name: 'taobao', url: 'https://www.taobao.com', category: 'ecommerce' },
  { name: 'jd', url: 'https://www.jd.com', category: 'ecommerce' },
  { name: 'amazon', url: 'https://www.amazon.com', category: 'ecommerce' },
  { name: 'pinduoduo', url: 'https://www.pinduoduo.com', category: 'ecommerce' },
  { name: 'twitter', url: 'https://twitter.com', category: 'social' },
  { name: 'linkedin', url: 'https://www.linkedin.com', category: 'social' },
  { name: 'facebook', url: 'https://www.facebook.com', category: 'social' },
  { name: 'reddit', url: 'https://www.reddit.com', category: 'social' },
  { name: 'instagram', url: 'https://www.instagram.com', category: 'social' },
  { name: 'tiktok', url: 'https://www.tiktok.com', category: 'video' },
  { name: 'netflix', url: 'https://www.netflix.com', category: 'video' },
  { name: 'iqiyi', url: 'https://www.iqiyi.com', category: 'video' },
  { name: 'youku', url: 'https://www.youku.com', category: 'video' },
  { name: 'tencent-video', url: 'https://v.qq.com', category: 'video' },
  { name: 'douban', url: 'https://www.douban.com', category: 'social' },
  { name: 'maoyan', url: 'https://maoyan.com', category: 'entertainment' },
  { name: 'dianping', url: 'https://www.dianping.com', category: 'local' },
  { name: 'meituan', url: 'https://www.meituan.com', category: 'local' },
  { name: 'eleme', url: 'https://www.ele.me', category: 'local' },
  { name: 'ctrip', url: 'https://www.ctrip.com', category: 'travel' },
  { name: 'qunar', url: 'https://www.qunar.com', category: 'travel' },
  { name: 'fliggy', url: 'https://www.fliggy.com', category: 'travel' },
  { name: 'airbnb', url: 'https://www.airbnb.com', category: 'travel' },
  { name: 'booking', url: 'https://www.booking.com', category: 'travel' },
  { name: 'lagou', url: 'https://www.lagou.com', category: 'job' },
  { name: 'zhipin', url: 'https://www.zhipin.com', category: 'job' },
  { name: 'linkedin-jobs', url: 'https://www.linkedin.com/jobs', category: 'job' },
  { name: 'indeed', url: 'https://www.indeed.com', category: 'job' },
  { name: 'juejin', url: 'https://juejin.cn', category: 'tech' },
  { name: 'csdn', url: 'https://www.csdn.net', category: 'tech' },
  { name: 'segmentfault', url: 'https://segmentfault.com', category: 'tech' },
  { name: 'oschina', url: 'https://www.oschina.net', category: 'tech' },
  { name: 'infoq', url: 'https://www.infoq.cn', category: 'tech' },
  { name: 'deepseek', url: 'https://www.deepseek.com', category: 'ai' },
  { name: 'openai', url: 'https://openai.com', category: 'ai' },
  { name: 'anthropic', url: 'https://www.anthropic.com', category: 'ai' },
  { name: 'huggingface', url: 'https://huggingface.co', category: 'ai' },
  { name: 'replicate', url: 'https://replicate.com', category: 'ai' },
  { name: 'vercel', url: 'https://vercel.com', category: 'tech' },
  { name: 'netlify', url: 'https://www.netlify.com', category: 'tech' },
  { name: 'cloudflare', url: 'https://www.cloudflare.com', category: 'tech' },
  { name: 'apple', url: 'https://www.apple.com', category: 'company' },
  { name: 'microsoft', url: 'https://www.microsoft.com', category: 'company' },
  { name: 'alibaba', url: 'https://www.alibaba.com', category: 'company' },
  { name: 'tencent', url: 'https://www.tencent.com', category: 'company' },
  { name: 'bytedance', url: 'https://www.bytedance.com', category: 'company' },
  { name: 'notion', url: 'https://www.notion.so', category: 'productivity' },
  { name: 'figma', url: 'https://www.figma.com', category: 'productivity' },
  { name: 'slack', url: 'https://slack.com', category: 'productivity' },
  { name: 'trello', url: 'https://trello.com', category: 'productivity' },
];

const CDP_URL = process.env.CDP_URL || 'http://localhost:9221';
const SESSION_NAME = 'download';

async function downloadHtml() {
  const outputDir = path.join(__dirname, '../tests/fixtures/websites');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`开始下载 ${websites.length} 个网站的HTML...\n`);
  console.log(`CDP: ${CDP_URL}`);
  console.log(`Session: ${SESSION_NAME}\n`);

  for (let i = 0; i < websites.length; i++) {
    const site = websites[i];
    const outputPath = path.join(outputDir, `${site.name}.html`);

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        console.log(`[${i + 1}/${websites.length}] ${site.name} - 已存在，跳过`);
        continue;
      }
    }

    try {
      console.log(`[${i + 1}/${websites.length}] 正在下载: ${site.name} (${site.url})`);

      const cmd = `npx tsx bin/mpage.ts --cdp "${CDP_URL}" --session ${SESSION_NAME} "goto ${site.url} --wait domcontentloaded && wait 3000 && html --selector body"`;

      const result = execSync(cmd, {
        cwd: path.join(__dirname, '..'),
        timeout: 60000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const html = result.trim();
      if (html && html.length > 100) {
        fs.writeFileSync(outputPath, html, 'utf-8');
        console.log(`  ✓ 已保存: ${outputPath} (${(html.length / 1024).toFixed(1)}KB)`);
      } else {
        console.log(`  ✗ 内容为空或太短`);
      }
    } catch (error) {
      const err = error as Error & { stderr?: string };
      console.log(`  ✗ 失败: ${err.message}`);
      if (err.stderr) {
        console.log(`    stderr: ${err.stderr.slice(0, 200)}`);
      }
    }
  }

  console.log('\n下载完成!');
}

downloadHtml().catch(console.error);
