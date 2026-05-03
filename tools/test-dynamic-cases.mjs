#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = '/Users/xuyingzhou/Project/temporary/multi-service-container/apps/tool-box/public/tools/crawler-practice/data/cases';
const REPORTS_DIR = join(__dirname, '../.xcli/reports');
const XCLI_BIN = join(__dirname, '../xcli/dist/bin/xcli.js');

const TEMPLATE_PLUGIN_MAP = {
  list: 't-list',
  detail: 't-detail',
  form: 't-form',
  captcha: 't-captcha',
  'anti-bot': 't-anti-bot',
  social: 't-social',
  mobile: 't-mobile',
  dynamic: 't-dynamic',
  'api-doc': 't-api-doc',
  error: 't-error',
  editor: 't-editor',
  dashboard: 't-dashboard',
};

const results = [];
let totalCases = 0;
let passedCases = 0;
let failedCases = 0;

function loadAllCases() {
  const files = readdirSync(CASES_DIR).filter((f) => f.endsWith('.json'));
  const cases = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(CASES_DIR, file), 'utf-8'));
      cases.push(data);
    } catch {}
  }
  return cases;
}

function getPluginForTemplate(template) {
  return TEMPLATE_PLUGIN_MAP[template] || TEMPLATE_PLUGIN_MAP['list'];
}

function runXCLI(pluginId, caseId, timeout = 20000) {
  return new Promise((resolve) => {
    const proc = spawn(XCLI_BIN, [pluginId, 'scrape', '--caseId', caseId], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr });
    });

    setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ success: false, stdout, stderr: 'Timeout' });
    }, timeout);
  });
}

async function testCase(caseData) {
  const { id, template, title } = caseData;
  const pluginId = getPluginForTemplate(template);
  totalCases++;

  process.stdout.write(`[${totalCases}] ${id} (${template}) → ${pluginId}: `);

  const result = { id, template, title, pluginId, status: 'error' };

  try {
    const { success, stdout, stderr } = await runXCLI(pluginId, id, 20000);

    if (success) {
      result.status = 'pass';
      result.output = stdout.substring(0, 500);
      passedCases++;
      process.stdout.write('✅\n');
    } else {
      result.status = 'fail';
      result.error = stderr.substring(0, 300) || stdout.substring(0, 300);
      failedCases++;
      process.stdout.write(`❌ ${result.error.substring(0, 80)}\n`);
    }
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
    failedCases++;
    process.stdout.write(`💥 ${err.message}\n`);
  }

  results.push(result);
  return result;
}

function generateReport() {
  if (!mkdirSync(REPORTS_DIR, { recursive: true })) mkdirSync(REPORTS_DIR, { recursive: true });

  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;

  const byTemplate = {};
  for (const r of results) {
    if (!byTemplate[r.template]) byTemplate[r.template] = { total: 0, pass: 0, fail: 0, error: 0 };
    byTemplate[r.template].total++;
    if (r.status === 'pass') byTemplate[r.template].pass++;
    else if (r.status === 'fail') byTemplate[r.template].fail++;
    else byTemplate[r.template].error++;
  }

  let md = `# 705 动态案例批量测试报告

## 总体统计

- 测试时间: ${new Date().toISOString()}
- 总案例数: ${totalCases}
- 通过: ${passedCases}
- 失败: ${failedCases}
- 通过率: ${passRate}%

## 按模板分类

| 模板 | 总数 | 通过 | 失败 | 通过率 |
|------|------|------|------|--------|
`;

  for (const [tpl, stats] of Object.entries(byTemplate).sort((a, b) => b[1].total - a[1].total)) {
    const rate = Math.round((stats.pass / stats.total) * 100);
    md += `| ${tpl} | ${stats.total} | ${stats.pass} | ${stats.fail + stats.error} | ${rate}% |\n`;
  }

  const failedResults = results.filter((r) => r.status !== 'pass');
  if (failedResults.length > 0 && failedResults.length <= 100) {
    md += '\n## 失败案例\n\n';
    for (const r of failedResults) {
      md += `- **${r.id}** (${r.template}, ${r.pluginId}): ${r.error || 'unknown'}\n`;
    }
  } else if (failedResults.length > 100) {
    md += `\n## 失败案例 (前100条, 共${failedResults.length}条)\n\n`;
    for (const r of failedResults.slice(0, 100)) {
      md += `- **${r.id}** (${r.template}, ${r.pluginId}): ${(r.error || 'unknown').substring(0, 100)}\n`;
    }
  }

  const reportPath = join(REPORTS_DIR, `dynamic-test-${Date.now()}.md`);
  writeFileSync(reportPath, md);
  console.log(`\n报告: ${reportPath}`);
}

async function main() {
  console.log('加载705案例数据...\n');
  const allCases = loadAllCases();
  console.log(`共 ${allCases.length} 个案例\n`);

  const batchSize = 10;
  for (let i = 0; i < allCases.length; i += batchSize) {
    const batch = allCases.slice(i, i + batchSize);
    await Promise.all(batch.map((c) => testCase(c)));
  }

  console.log('\n--- 生成报告 ---\n');
  generateReport();

  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;
  console.log(`\n总计: ${totalCases} | 通过: ${passedCases} | 失败: ${failedCases} | 通过率: ${passRate}%`);

  process.exit(failedCases > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
