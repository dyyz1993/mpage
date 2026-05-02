#!/usr/bin/env node

/**
 * 插件生成器 - 生成缺失的 36 个案例插件
 *
 * 功能:
 * 1. 检查哪些插件缺失
 * 2. 根据案例 ID 生成插件模板
 * 3. 创建标准的插件结构（index.ts, package.json, VERIFICATION.md）
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(__dirname, '../.xcli/plugins');

// 36 个案例的元数据
const CASES = [
  // Phase 1: 基础难度（1-5）- 已完成
  { id: '01', name: 'static', title: '静态HTML页面读取', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html', requiresLogin: false, difficulty: 'basic', description: '模拟博客首页，纯静态HTML。提取文章标题、链接和发布时间。' },
  { id: '02', name: 'extract-urls', title: '提取页面URL', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/02-extract-urls.html', requiresLogin: false, difficulty: 'basic', description: '新闻列表页。提取所有文章链接，处理相对路径和URL拼接。' },
  { id: '03', name: 'extract-content', title: '提取文章内容', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/03-extract-content.html', requiresLogin: false, difficulty: 'basic', description: '文章详情页。提取标题、正文、作者、发布时间和图片链接。' },
  { id: '04', name: 'pagination', title: '简单分页', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/04-pagination.html', requiresLogin: false, difficulty: 'basic', description: '传统的"上一页/下一页"分页。获取总页数并遍历所有分页。' },
  { id: '05', name: 'url-params', title: 'URL参数控制', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/05-url-params.html', requiresLogin: false, difficulty: 'basic', description: '通过URL参数控制内容（如 ?page=1&category=news）。' },

  // Phase 2: 中等难度（6-12）
  { id: '06', name: 'infinite-scroll', title: '无限滚动加载', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/06-infinite-scroll.html', requiresLogin: false, difficulty: 'medium', description: '模拟微博/Twitter首页。分析滚动加载的API请求并模拟AJAX。' },
  { id: '07', name: 'lazy-load', title: '懒加载/点击加载', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/07-lazy-load.html', requiresLogin: false, difficulty: 'medium', description: '"加载更多"按钮。触发加载更多操作并获取数据。' },
  { id: '08', name: 'search', title: '搜索功能', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08-search.html', requiresLogin: false, difficulty: 'medium', description: '搜索表单 + 结果页。提交搜索表单并解析搜索结果。' },
  { id: '09', name: 'rate-limit', title: 'IP限流模拟', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/09-rate-limit.html', requiresLogin: false, difficulty: 'medium', description: '模拟服务器限流（快速返回429）。处理限流响应和请求延时。' },
  { id: '10', name: 'login', title: '简单登录', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10-login.html', requiresLogin: true, difficulty: 'medium', description: '用户名密码登录（admin/password）。提交登录表单并保持状态。' },
  { id: '11', name: 'session', title: 'Session/Cookie保持', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/11-session.html', requiresLogin: true, difficulty: 'medium', description: '登录后访问受限页面。携带Cookie访问并维持会话状态。' },
  { id: '12', name: 'captcha-numeric', title: '图片验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/12-captcha-numeric.html', requiresLogin: false, difficulty: 'medium', description: 'Canvas生成简单数字+字母验证码。识别验证码或使用OCR工具。' },

  // Phase 3: 进阶难度（13-16）
  { id: '13', name: 'captcha-slider', title: '滑块验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/13-captcha-slider.html', requiresLogin: false, difficulty: 'advanced', description: '拖动滑块验证（模拟极验）。分析请求并计算滑动距离。' },
  { id: '14', name: 'captcha-click', title: '点选验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/14-captcha-click.html', requiresLogin: false, difficulty: 'advanced', description: '按顺序点击图中文字。识别目标并模拟点击操作。' },
  { id: '15', name: 'captcha-rotate', title: '旋转验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/15-captcha-rotate.html', requiresLogin: false, difficulty: 'advanced', description: '拖动旋转图片到正确角度。计算旋转角度。' },
  { id: '16', name: 'captcha-arithmetic', title: '算术验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/16-captcha-arithmetic.html', requiresLogin: false, difficulty: 'advanced', description: '计算验证码（如 3+5=?）。解析算术表达式并自动计算。' },

  // Phase 4: 高级难度（17-20）
  { id: '17', name: 'file-upload', title: '文件上传场景', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/17-file-upload.html', requiresLogin: false, difficulty: 'advanced', description: '上传图片获取识别结果。模拟文件上传和编码处理。' },
  { id: '18', name: 'iframe-login', title: 'iframe嵌套', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/18-iframe-login.html', requiresLogin: true, difficulty: 'advanced', description: '登录框在iframe中。切换到iframe并操作内部元素。' },
  { id: '19', name: 'dynamic-captcha', title: '动态验证码', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/19-dynamic-captcha.html', requiresLogin: false, difficulty: 'advanced', description: '访问多次后或操作到一半时弹出验证码。处理动态出现的验证。' },
  { id: '20', name: 'comprehensive', title: '综合反爬场景', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/20-comprehensive.html', requiresLogin: true, difficulty: 'advanced', description: '组合登录+Session+验证码+限流。综合运用各种技术设计稳定爬虫。' },

  // Phase 5: 现代前端技术（21-23）
  { id: '21', name: 'shadow-dom', title: 'Shadow DOM元素提取', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/21-shadow-dom.html', requiresLogin: false, difficulty: 'expert', description: '数据封装在 Shadow DOM 中。遍历 shadowRoot 提取封装的数据。' },
  { id: '22', name: 'portal-teleport', title: 'Portal / Teleport渲染', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/22-portal-teleport.html', requiresLogin: false, difficulty: 'expert', description: '内容渲染到 body。处理脱离组件树的元素。' },
  { id: '23', name: 'css-in-js', title: 'CSS-in-JS动态类名', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/23-css-in-js.html', requiresLogin: false, difficulty: 'expert', description: '随机类名无法使用。使用 data-testid、aria-label 等属性提取。' },

  // Phase 6: 真实业务场景（24-27）
  { id: '24', name: 'social-media', title: '社交媒体', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/24-social-media.html', requiresLogin: false, difficulty: 'expert', description: '提取推文内容、作者、时间、转发/评论/点赞数据。' },
  { id: '25', name: 'video-website', title: '视频网站', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/25-video-website.html', requiresLogin: false, difficulty: 'expert', description: '提取视频信息、弹幕内容（时间+文本）、所有评论页。' },
  { id: '26', name: 'job-site', title: '招聘网站', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/26-job-site.html', requiresLogin: false, difficulty: 'expert', description: '构造筛选参数、处理虚拟滚动职位列表、提取详情和聊天记录。' },
  { id: '27', name: 'real-estate', title: '房产网站', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/27-real-estate.html', requiresLogin: false, difficulty: 'expert', description: '处理地图坐标选区、提取小区信息、历史成交价格趋势。' },

  // Phase 7: 高级数据加载（28-30）
  { id: '28', name: 'virtual-scroll', title: 'Virtual DOM虚拟滚动', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/28-virtual-scroll.html', requiresLogin: false, difficulty: 'expert', description: 'DOM 只渲染可见项。直接调用 API 获取完整数据。' },
  { id: '29', name: 'document-fragment', title: 'DocumentFragment动态内容', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/29-document-fragment.html', requiresLogin: false, difficulty: 'expert', description: '使用 Fragment 批量插入。监听 DOM 变化捕获内容。' },
  { id: '30', name: 'xhr-intercept', title: 'XHR / Fetch拦截', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/30-xhr-intercept.html', requiresLogin: false, difficulty: 'expert', description: '数据完全通过 XHR 加载。拦截请求或直接调用 API。' },

  // Phase 8: 终极挑战（31-36）
  { id: '31', name: 'comprehensive-challenge', title: '综合挑战', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/31-comprehensive-challenge.html', requiresLogin: false, difficulty: 'expert', description: '组合 Shadow DOM + 虚拟滚动 + CSS-in-JS + Portal + XHR + WebSocket。综合运用所有技术！' },
  { id: '32', name: 'ecommerce-seller', title: '电商卖家中心', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/32-ecommerce-seller.html', requiresLogin: true, difficulty: 'expert', description: '模拟淘宝卖家中心、京东商家后台。登录后查看订单列表，支持日期筛选和数据导出。' },
  { id: '33', name: 'government-tender', title: '政府招标网', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/33-government-tender.html', requiresLogin: true, difficulty: 'expert', description: '模拟政府采购网。滑块验证登录后搜索招标公告，部分内容需要登录才能查看。' },
  { id: '34', name: 'secondhand-market', title: '二手交易平台', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/34-secondhand-market.html', requiresLogin: true, difficulty: 'expert', description: '模拟闲鱼平台。登录后发布商品（上传图片），查看虚拟电话号码，有发布频率限制。' },
  { id: '35', name: 'qa-community', title: '知识问答社区', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/35-qa-community.html', requiresLogin: true, difficulty: 'expert', description: '模拟知乎社区。点选验证码登录，用户信息卡片使用Shadow DOM封装，问题列表虚拟滚动。' },
  { id: '36', name: 'stock-trading', title: '证券交易行情', url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/36-stock-trading.html', requiresLogin: true, difficulty: 'expert', description: '模拟股票交易平台。密码+短信验证码双重认证，API数据Base64加密，MD5签名验证，Canvas绘制K线图。' },
];

/**
 * 生成插件 index.ts 模板
 */
function generateIndexTemplate(caseInfo) {
  return `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// 数据 schema（根据实际情况调整）
const itemSchema = z.object({
  title: z.string().describe('标题'),
  // 根据案例需求添加更多字段
});

// 结果 schema
const resultSchema = z.object({
  data: z.array(itemSchema),
  tips: z.array(z.string()).optional().default([]),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '${caseInfo.id}-${caseInfo.name}',
    url: '${caseInfo.url}',
    requiresLogin: ${caseInfo.requiresLogin},
  });

  // scrape 命令：采集数据
  plugin.command('scrape', {
    description: '${caseInfo.description}',
    parameters: z.object({
      // 根据需要添加参数
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli ${caseInfo.id}-${caseInfo.name} scrape',
        output: \`data:
  - title: "示例数据"
tips:
  - "采集成功"\`,
      },
    ],
    handler: async (params, ctx) => {
      // TODO: 实现采集逻辑
      await ctx.page.goto('${caseInfo.url}');
      await ctx.page.waitForSelector('h2');

      const data = await ctx.page.evaluate(() => {
        // TODO: 根据页面结构提取数据
        return [];
      });

      return {
        data,
        tips: ['采集成功'],
      };
    },
  });

  // verify 命令：自动验证
  plugin.command('verify', {
    description: '自动验证采集结果',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(itemSchema),
      errors: z.array(z.object({
        field: z.string(),
        expected: z.string(),
        actual: z.string(),
      })),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli ${caseInfo.id}-${caseInfo.name} verify',
        output: \`status: pass
data:
  - title: "示例数据"
errors: []
tips:
  - "校验通过"\`,
      },
    ],
    handler: async (params, ctx) => {
      // TODO: 实现验证逻辑
      await ctx.page.goto('${caseInfo.url}');
      await ctx.page.waitForSelector('h2');

      const data = await ctx.page.evaluate(() => {
        return [];
      });

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      // TODO: 添加验证逻辑

      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips = status === 'pass' ? ['校验通过'] : ['校验失败'];

      return { status, data, errors, tips };
    },
  });
}
`;
}

/**
 * 生成 package.json 模板
 */
function generatePackageTemplate(caseInfo) {
  return JSON.stringify(
    {
      name: `${caseInfo.id}-${caseInfo.name}`,
      version: '1.0.0',
      type: 'module',
    },
    null,
    2,
  );
}

/**
 * 生成 VERIFICATION.md 模板
 */
function generateVerificationTemplate(caseInfo) {
  return `# ${caseInfo.id}. ${caseInfo.title} - 手动验证文档

## 案例 URL
${caseInfo.url}

## 描述
${caseInfo.description}

## 难度
${caseInfo.difficulty === 'basic' ? '⭐⭐ 基础' : caseInfo.difficulty === 'medium' ? '⭐⭐⭐⭐⭐ 中等' : caseInfo.difficulty === 'advanced' ? '⭐⭐⭐⭐⭐⭐⭐ 进阶' : '⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ 专家'}

## 需要登录
${caseInfo.requiresLogin ? '是' : '否'}

## 验证目标
- 目标1：描述
- 目标2：描述

## 预期结果
\`\`\`json
{
  "data": [
    {
      "title": "示例数据"
    }
  ],
  "tips": ["采集成功"]
}
\`\`\`

## 验证步骤
1. 运行命令: \`xcli ${caseInfo.id}-${caseInfo.name} scrape\`
2. 检查输出是否符合预期
3. 运行命令: \`xcli ${caseInfo.id}-${caseInfo.name} verify\`
4. 确认验证通过

## 已知问题
- 无

## 改进建议
- 无

## 技术要点
<!-- 记录实现过程中用到的技术要点和难点 -->
`;
}

/**
 * 生成插件
 */
function generatePlugin(caseInfo) {
  const pluginDir = join(PLUGINS_DIR, `${caseInfo.id}-${caseInfo.name}`);

  if (existsSync(pluginDir)) {
    console.log(`⚠️  插件 ${caseInfo.id}-${caseInfo.name} 已存在，跳过`);
    return;
  }

  console.log(`📦 生成插件: ${caseInfo.id}-${caseInfo.name}`);

  // 创建目录
  mkdirSync(pluginDir, { recursive: true });

  // 生成 index.ts
  writeFileSync(join(pluginDir, 'index.ts'), generateIndexTemplate(caseInfo));

  // 生成 package.json
  writeFileSync(join(pluginDir, 'package.json'), generatePackageTemplate(caseInfo));

  // 生成 VERIFICATION.md
  writeFileSync(join(pluginDir, 'VERIFICATION.md'), generateVerificationTemplate(caseInfo));

  console.log(`✅ 插件 ${caseInfo.id}-${caseInfo.name} 生成完成`);
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始生成插件...\n');

  // 检查现有插件
  const existingPlugins = CASES.filter((c) => existsSync(join(PLUGINS_DIR, `${c.id}-${c.name}`)));
  const missingPlugins = CASES.filter((c) => !existsSync(join(PLUGINS_DIR, `${c.id}-${c.name}`)));

  console.log(`📦 现有插件: ${existingPlugins.length}`);
  console.log(`📦 缺失插件: ${missingPlugins.length}\n`);

  if (missingPlugins.length === 0) {
    console.log('✅ 所有插件已存在！');
    return;
  }

  // 生成缺失的插件
  missingPlugins.forEach(generatePlugin);

  console.log(`\n✅ 完成！生成了 ${missingPlugins.length} 个插件`);
  console.log(`\n下一步:`);
  console.log(`1. 完善每个插件的采集和验证逻辑`);
  console.log(`2. 运行测试: node tools/test-plugins.mjs`);
}

main();
