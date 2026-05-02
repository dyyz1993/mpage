#!/usr/bin/env node

/**
 * 元数据查询和报告生成器
 *
 * 功能:
 * 1. 查询所有插件的元数据
 * 2. 生成能力矩阵（哪些插件依赖哪些能力）
 * 3. 生成进度报告
 * 4. 检测缺失的能力
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(__dirname, '../.xcli/plugins');
const REPORTS_DIR = join(__dirname, '../.xcli/reports');

// mpage 能力列表
const MPAGE_CAPABILITIES = [
  'goto', 'click', 'fill', 'type', 'press', 'hover', 'scroll', 'select', 'check',
  'query', 'find', 'html', 'text', 'structure', 'a11y', 'snapshot',
  'waitForSelector', 'waitForTimeout', 'wait', 'evaluate',
  'humanize', 'recorder', 'network-intercept', 'cookie-manager'
];

// xcli 能力列表
const XCLI_CAPABILITIES = [
  'retry-policy', 'session-storage', 'captcha-integration',
  'file-upload', 'iframe-switch', 'shadow-dom', 'portal-tracker',
  'virtual-scroll', 'xhr-intercept', 'data-export'
];

/**
 * 插件元数据
 */

/**
 * 解析插件能力
 */
function parseCapabilities(content) {
  const mpage = [];
  const xcli = [];

  // 检测 mpage 能力
  MPAGE_CAPABILITIES.forEach((cap) => {
    if (content.includes(cap) || content.includes(`ctx.page.${cap}`) || content.includes(`page.${cap}`)) {
      mpage.push(cap);
    }
  });

  // 检测 xcli 能力
  XCLI_CAPABILITIES.forEach((cap) => {
    if (content.includes(cap)) {
      xcli.push(cap);
    }
  });

  return { mpage, xcli };
}

/**
 * 获取所有插件元数据
 */
function getPluginsMetadata() {
  const plugins = [];

  for (let i = 1; i <= 36; i++) {
    const id = i.toString().padStart(2, '0');
    const pluginPath = join(PLUGINS_DIR, `${id}-*`);

    // 查找插件目录
    const dirs = readdirSync(PLUGINS_DIR).filter((d) => d.startsWith(`${id}-`));

    if (dirs.length === 0) {
      plugins.push({
        id,
        name: '',
        title: `案例 ${id}`,
        url: '',
        requiresLogin: false,
        difficulty: 'unknown',
        status: 'missing',
        capabilities: { mpage: [], xcli: [] },
        hasVerify: false,
      });
      continue;
    }

    const pluginDir = join(PLUGINS_DIR, dirs[0]);
    const indexPath = join(pluginDir, 'index.ts');

    if (!existsSync(indexPath)) {
      plugins.push({
        id,
        name: dirs[0],
        title: `案例 ${id}`,
        url: '',
        requiresLogin: false,
        difficulty: 'unknown',
        status: 'template',
        capabilities: { mpage: [], xcli: [] },
        hasVerify: false,
      });
      continue;
    }

    const content = readFileSync(indexPath, 'utf-8');

    // 提取元数据
    const urlMatch = content.match(/url:\s*['"]([^'"]+)['"]/);
    const requiresLoginMatch = content.match(/requiresLogin:\s*(true|false)/);
    const nameMatch = dirs[0].match(/^\d{2}-(.+)$/);

    plugins.push({
      id,
      name: nameMatch ? nameMatch[1] : '',
      title: `案例 ${id}`,
      url: urlMatch ? urlMatch[1] : '',
      requiresLogin: requiresLoginMatch ? requiresLoginMatch[1] === 'true' : false,
      difficulty: 'unknown',
      status: 'existing',
      capabilities: parseCapabilities(content),
      hasVerify: /command\(['"]verify['"]/.test(content),
    });
  }

  return plugins;
}

/**
 * 生成能力矩阵
 */
function generateCapabilityMatrix(plugins) {
  let markdown = `## 🔧 能力矩阵\n\n`;
  markdown += `| 插件 | mpage 能力 | xcli 能力 |\n`;
  markdown += `|------|-----------|------------|\n`;

  plugins.forEach((p) => {
    const mpageCaps = p.capabilities.mpage.join(', ') || '-';
    const xcliCaps = p.capabilities.xcli.join(', ') || '-';
    markdown += `| ${p.id}-${p.name} | ${mpageCaps} | ${xcliCaps} |\n`;
  });

  return markdown;
}

/**
 * 生成进度报告
 */
function generateProgressReport(plugins) {
  const existing = plugins.filter((p) => p.status === 'existing').length;
  const template = plugins.filter((p) => p.status === 'template').length;
  const missing = plugins.filter((p) => p.status === 'missing').length;
  const withVerify = plugins.filter((p) => p.hasVerify).length;

  let markdown = `# 插件开发进度报告

> 生成时间: ${new Date().toISOString()}

## 📊 总体统计

- **总计**: ${plugins.length} 个插件
- **已实现**: ${existing} (${Math.round((existing / plugins.length) * 100)}%)
- **模板**: ${template} (${Math.round((template / plugins.length) * 100)}%)
- **缺失**: ${missing} (${Math.round((missing / plugins.length) * 100)}%)
- **有 verify 命令**: ${withVerify}/${existing}

## 📈 分阶段进度

`;

  // 按阶段分组
  const phases = [
    { name: 'Phase 1 (基础难度 1-5)', range: [1, 5] },
    { name: 'Phase 2 (中等难度 6-12)', range: [6, 12] },
    { name: 'Phase 3 (进阶难度 13-16)', range: [13, 16] },
    { name: 'Phase 4 (高级难度 17-20)', range: [17, 20] },
    { name: 'Phase 5 (现代前端技术 21-23)', range: [21, 23] },
    { name: 'Phase 6 (真实业务场景 24-27)', range: [24, 27] },
    { name: 'Phase 7 (高级数据加载 28-30)', range: [28, 30] },
    { name: 'Phase 8 (终极挑战 31-36)', range: [31, 36] },
  ];

  phases.forEach((phase) => {
    const phasePlugins = plugins.filter(
      (p) => parseInt(p.id) >= phase.range[0] && parseInt(p.id) <= phase.range[1],
    );
    const phaseExisting = phasePlugins.filter((p) => p.status === 'existing').length;
    const phaseProgress = Math.round((phaseExisting / phasePlugins.length) * 100);

    markdown += `### ${phase.name}\n\n`;
    markdown += `- 进度: ${phaseExisting}/${phasePlugins.length} (${phaseProgress}%)\n`;
    markdown += `- 状态: ${phaseProgress === 100 ? '✅ 完成' : phaseProgress > 0 ? '🚧 进行中' : '📋 未开始'}\n\n`;

    phasePlugins.forEach((p) => {
      const statusIcon = p.status === 'existing' ? '✅' : p.status === 'template' ? '📝' : '❌';
      const verifyIcon = p.hasVerify ? '✅' : '➖';
      markdown += `- ${statusIcon} ${p.id}-${p.name} ${verifyIcon}\n`;
    });

    markdown += '\n';
  });

  return markdown;
}

/**
 * 检测缺失的能力
 */
function detectMissingCapabilities(plugins) {
  const usedMpage = new Set();
  const usedXcli = new Set();

  plugins.forEach((p) => {
    p.capabilities.mpage.forEach((cap) => usedMpage.add(cap));
    p.capabilities.xcli.forEach((cap) => usedXcli.add(cap));
  });

  const missingMpage = MPAGE_CAPABILITIES.filter((cap) => !usedMpage.has(cap));
  const missingXcli = XCLI_CAPABILITIES.filter((cap) => !usedXcli.has(cap));

  let markdown = `## 🔍 缺失能力检测\n\n`;

  if (missingMpage.length > 0) {
    markdown += `### mpage 缺失能力\n\n`;
    missingMpage.forEach((cap) => {
      markdown += `- ${cap}\n`;
    });
    markdown += '\n';
  } else {
    markdown += `### mpage 能力 ✅\n\n所有能力已覆盖。\n\n`;
  }

  if (missingXcli.length > 0) {
    markdown += `### xcli 缺失能力\n\n`;
    missingXcli.forEach((cap) => {
      markdown += `- ${cap}\n`;
    });
    markdown += '\n';
  } else {
    markdown += `### xcli 能力 ✅\n\n所有能力已覆盖。\n\n`;
  }

  return markdown;
}

/**
 * 生成完整报告
 */
function generateReport() {
  console.log('📊 生成元数据报告...\n');

  const plugins = getPluginsMetadata();

  let markdown = generateProgressReport(plugins);
  markdown += generateCapabilityMatrix(plugins);
  markdown += detectMissingCapabilities(plugins);

  // 写入文件
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = join(REPORTS_DIR, `metadata-report-${Date.now()}.md`);
  writeFileSync(reportPath, markdown);

  console.log(`📄 报告已生成: ${reportPath}`);
  console.log(`\n📊 统计:`);
  console.log(`   已实现: ${plugins.filter((p) => p.status === 'existing').length}`);
  console.log(`   模板: ${plugins.filter((p) => p.status === 'template').length}`);
  console.log(`   缺失: ${plugins.filter((p) => p.status === 'missing').length}`);
  console.log(`   有 verify: ${plugins.filter((p) => p.hasVerify).length}`);
}

generateReport();
