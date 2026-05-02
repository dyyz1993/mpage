#!/usr/bin/env node

/**
 * 插件自动化测试运行器
 *
 * 功能:
 * 1. 遍历所有插件，执行 scrape 和 verify 命令
 * 2. 记录测试结果（成功/失败/错误）
 * 3. 生成测试报告（Markdown + HTML）
 * 4. 记录失败的改进点
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(dirname(__filename), '../.xcli/plugins');
const REPORTS_DIR = join(dirname(__filename), '../.xcli/reports');
const IMPROVEMENTS_DIR = join(dirname(__filename), '../docs/improvements');
const XCLI_BIN = join(dirname(__filename), '../xcli/dist/bin/xcli.js');

// 全局结果
const results = [];
const improvements = [];

/**
 * 获取所有插件列表（按序号排序）
 */
function getPluginList() {
  const dirs = readdirSync(PLUGINS_DIR);
  return dirs
    .filter((d) => /^\d{2}-/.test(d))
    .sort((a, b) => parseInt(a.slice(0, 2)) - parseInt(b.slice(0, 2)));
}

/**
 * 检查插件是否包含 verify 命令
 */
function hasVerifyCommand(pluginPath) {
  const indexPath = join(pluginPath, 'index.ts');
  if (!existsSync(indexPath)) return false;
  const content = readFileSync(indexPath, 'utf-8');
  return /command\(['"]verify['"]/.test(content);
}

/**
 * 读取插件元数据
 */
function getPluginMetadata(pluginId) {
  const pluginPath = join(PLUGINS_DIR, pluginId);
  const indexPath = join(pluginPath, 'index.ts');
  const metadata = { id: pluginId, name: pluginId };

  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, 'utf-8');
    const urlMatch = content.match(/url:\s*['"]([^'"]+)['"]/);
    if (urlMatch) metadata.url = urlMatch[1];
    const requiresLoginMatch = content.match(/requiresLogin:\s*(true|false)/);
    if (requiresLoginMatch) metadata.requiresLogin = requiresLoginMatch[1] === 'true';
    metadata.hasVerify = /command\(['"]verify['"]/.test(content);
  }

  return metadata;
}

/**
 * 执行 xcli 命令并返回结果
 */
function runXCLI(pluginId, command) {
  return new Promise((resolve) => {
    const args = [pluginId, command];
    // xcli 需要在项目根目录（mpage/）下运行
    const proc = spawn(XCLI_BIN, args, { cwd: join(dirname(__filename), '..') });

    let stdout = '';
    let stderr = '';
    let success = true;

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      success = false;
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0 && success, stdout, stderr });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ success: false, stdout: '', stderr: 'Timeout after 30s' });
    }, 30000);
  });
}

/**
 * 解析命令输出
 */
function parseOutput(stdout) {
  try {
    // 尝试解析 JSON 格式
    if (stdout.trim().startsWith('{') || stdout.trim().startsWith('[')) {
      return JSON.parse(stdout.trim());
    }

    // 解析 YAML 格式（简化版）
    const result = {};
    let currentSection = result;

    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2].trim();
        if (key === 'data' || key === 'errors' || key === 'tips') {
          currentSection[key] = [];
        } else if (line.startsWith('  - ')) {
          if (Array.isArray(currentSection)) {
            const item = {};
            const subLines = line.trim().slice(2).split(/\s+/);
            for (let i = 0; i < subLines.length; i += 2) {
              if (subLines[i + 1]) {
                item[subLines[i].replace(':', '')] = subLines[i + 1];
              }
            }
            currentSection.push(item);
          }
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  } catch (e) {
    return { raw: stdout.trim() };
  }
}

/**
 * 测试单个插件
 */
async function testPlugin(pluginId) {
  console.log(`\n📦 测试插件: ${pluginId}`);

  const metadata = getPluginMetadata(pluginId);
  const result = {
    pluginId,
    pluginName: metadata.name,
    status: 'error',
    timestamp: new Date().toISOString(),
  };

  // 1. 测试 scrape 命令
  console.log(`  🔍 执行 scrape...`);
  const scrapeResult = await runXCLI(pluginId, 'scrape');

  if (!scrapeResult.success) {
    result.status = 'error';
    result.errorMessage = scrapeResult.stderr || 'scrape failed';
    console.log(`  ❌ scrape 失败: ${result.errorMessage}`);
    results.push(result);
    return result;
  }

  const scrapeOutput = parseOutput(scrapeResult.stdout);
  result.data = scrapeOutput.data || scrapeOutput;
  result.tips = scrapeOutput.tips;
  result.scrapeStatus = 'pass';
  console.log(`  ✅ scrape 成功`);

  // 2. 测试 verify 命令（如果有）
  if (metadata.hasVerify) {
    console.log(`  🔍 执行 verify...`);
    const verifyResult = await runXCLI(pluginId, 'verify');

    if (!verifyResult.success) {
      result.verifyStatus = 'fail';
      result.errorMessage = verifyResult.stderr || 'verify failed';
      console.log(`  ❌ verify 失败: ${result.errorMessage}`);
    } else {
      const verifyOutput = parseOutput(verifyResult.stdout);
      result.verifyStatus = verifyOutput.status || 'pass';
      result.errors = verifyOutput.errors;

      if (result.verifyStatus === 'fail') {
        result.status = 'fail';
        console.log(`  ⚠️  verify 失败: ${result.errors?.length} 个错误`);

        // 记录改进点
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((err) => {
            improvements.push({
              pluginId,
              type: 'validation',
              description: `字段 ${err.field} 验证失败: 期望 ${err.expected}, 实际 ${err.actual}`,
              priority: 'medium',
            });
          });
        }
      } else {
        result.status = 'success';
        console.log(`  ✅ verify 成功`);
      }
    }
  } else {
    result.status = 'success';
    console.log(`  ⚠️  无 verify 命令，仅测试 scrape`);
  }

  results.push(result);
  return result;
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport() {
  const passed = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const errored = results.filter((r) => r.status === 'error').length;

  let markdown = `# 插件测试报告

## 📊 总体统计

- **测试时间**: ${new Date().toISOString()}
- **总插件数**: ${results.length}
- **成功**: ${passed} ✅
- **失败**: ${failed} ⚠️
- **错误**: ${errored} ❌
- **通过率**: ${Math.round((passed / results.length) * 100)}%

`;

  // 按阶段分组
  const phases = {
    'Phase 1 (基础难度 1-5)': [],
    'Phase 2 (中等难度 6-12)': [],
    'Phase 3 (进阶难度 13-16)': [],
    'Phase 4 (高级难度 17-20)': [],
    'Phase 5 (现代前端技术 21-23)': [],
    'Phase 6 (真实业务场景 24-27)': [],
    'Phase 7 (高级数据加载 28-30)': [],
    'Phase 8 (终极挑战 31-36)': [],
  };

  results.forEach((r) => {
    const num = parseInt(r.pluginId.slice(0, 2));
    if (num <= 5) phases['Phase 1 (基础难度 1-5)'].push(r.pluginId);
    else if (num <= 12) phases['Phase 2 (中等难度 6-12)'].push(r.pluginId);
    else if (num <= 16) phases['Phase 3 (进阶难度 13-16)'].push(r.pluginId);
    else if (num <= 20) phases['Phase 4 (高级难度 17-20)'].push(r.pluginId);
    else if (num <= 23) phases['Phase 5 (现代前端技术 21-23)'].push(r.pluginId);
    else if (num <= 27) phases['Phase 6 (真实业务场景 24-27)'].push(r.pluginId);
    else if (num <= 30) phases['Phase 7 (高级数据加载 28-30)'].push(r.pluginId);
    else phases['Phase 8 (终极挑战 31-36)'].push(r.pluginId);
  });

  for (const [phase, plugins] of Object.entries(phases)) {
    if (plugins.length === 0) continue;

    markdown += `## ${phase}\n\n`;
    markdown += `| 插件 | 状态 | Scrape | Verify | Tips |\n`;
    markdown += `|------|------|--------|--------|------|\n`;

    plugins.forEach((id) => {
      const r = results.find((res) => res.pluginId === id);
      if (!r) return;

      const statusIcon = r.status === 'success' ? '✅' : r.status === 'fail' ? '⚠️' : '❌';
      const scrapeIcon = r.scrapeStatus === 'pass' ? '✅' : '❌';
      const verifyIcon = r.verifyStatus === 'pass' ? '✅' : r.verifyStatus === 'fail' ? '⚠️' : '➖';
      const tips = r.tips ? r.tips.join('; ') : '-';

      markdown += `| ${id} | ${statusIcon} ${r.status} | ${scrapeIcon} | ${verifyIcon} | ${tips} |\n`;
    });

    markdown += '\n';
  }

  // 失败详情
  if (failed > 0) {
    markdown += `## ❌ 失败详情\n\n`;
    results
      .filter((r) => r.status === 'fail')
      .forEach((r) => {
        markdown += `### ${r.pluginId}\n\n`;
        markdown += `**状态**: ${r.status}\n\n`;
        if (r.errors && r.errors.length > 0) {
          markdown += `        **错误列表**:\n\n`;
          r.errors.forEach((err) => {
            markdown += `- ${err.field}: 期望 ${err.expected}, 实际 ${err.actual}\n`;
          });
          markdown += '\n';
        }
        markdown += `**Tips**: ${r.tips?.join('; ') || '-'}\n\n`;
      });
  }

  // 错误详情
  if (errored > 0) {
    markdown += `## 🔧 错误详情\n\n`;
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        markdown += `### ${r.pluginId}\n\n`;
        markdown += `**错误**: ${r.errorMessage}\n\n`;
      });
  }

  // 改进点
  if (improvements.length > 0) {
    markdown += `## 📝 改进点\n\n`;
    improvements.forEach((imp) => {
      const priorityIcon = imp.priority === 'high' ? '🔴' : imp.priority === 'medium' ? '🟡' : '🟢';
      markdown += `- [${imp.pluginId}] ${priorityIcon} ${imp.description}\n`;
    });
    markdown += '\n';
  }

  // 写入文件
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = join(REPORTS_DIR, `test-report-${Date.now()}.md`);
  writeFileSync(reportPath, markdown);
  console.log(`\n📄 报告已生成: ${reportPath}`);
}

/**
 * 生成改进点文件
 */
function generateImprovementsFile() {
  if (improvements.length === 0) return;

  if (!existsSync(IMPROVEMENTS_DIR)) mkdirSync(IMPROVEMENTS_DIR, { recursive: true });

  let content = `# 改进点追踪

> 生成时间: ${new Date().toISOString()}
> 总计: ${improvements.length} 个改进点

## 📊 按优先级分类

### 🔴 高优先级
${improvements
  .filter((i) => i.priority === 'high')
  .map((i) => `- [${i.pluginId}] ${i.description}`)
  .join('\n') || '无'}

### 🟡 中优先级
${improvements
  .filter((i) => i.priority === 'medium')
  .map((i) => `- [${i.pluginId}] ${i.description}`)
  .join('\n') || '无'}

### 🟢 低优先级
${improvements
  .filter((i) => i.priority === 'low')
  .map((i) => `- [${i.pluginId}] ${i.description}`)
  .join('\n') || '无'}

## 📦 按插件分类
`;

  const byPlugin = {};
  improvements.forEach((i) => {
    if (!byPlugin[i.pluginId]) byPlugin[i.pluginId] = [];
    byPlugin[i.pluginId].push(i);
  });

  for (const [pluginId, items] of Object.entries(byPlugin)) {
    content += `### ${pluginId}\n\n`;
    items.forEach((item) => {
      const priorityIcon = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      content += `- ${priorityIcon} ${item.description}\n`;
    });
    content += '\n';
  }

  const filePath = join(IMPROVEMENTS_DIR, 'improvements.md');
  writeFileSync(filePath, content);
  console.log(`📝 改进点文件已生成: ${filePath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始插件自动化测试...\n');

  const plugins = getPluginList();
  console.log(`📦 发现 ${plugins.length} 个插件\n`);

  for (const pluginId of plugins) {
    await testPlugin(pluginId);
  }

  console.log('\n📊 生成测试报告...\n');
  generateMarkdownReport();
  generateImprovementsFile();

  const passed = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const errored = results.filter((r) => r.status === 'error').length;

  console.log(`\n✅ 测试完成!`);
  console.log(`   成功: ${passed}`);
  console.log(`   失败: ${failed}`);
  console.log(`   错误: ${errored}`);
  console.log(`   通过率: ${Math.round((passed / results.length) * 100)}%`);

  process.exit(failed + errored);
}

main().catch((err) => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
