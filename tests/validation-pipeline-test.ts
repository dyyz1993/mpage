#!/usr/bin/env npx tsx
/**
 * 自动化测试三层验证管线
 * 覆盖 L1 功能、L2 行为、L3 回归、archive 存储
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const ARCHIVE_PATH = path.join(homedir(), '.xcli', 'archives', 'validation-test.json');

interface ValidationReport {
  l1_functional: { status: string; detail: string };
  l2_behavior: {
    status: string;
    score: number;
    mdGap: number;
    offsetStd: number;
    instantClickRatio: number;
    details: string[];
  };
  l3_regression: { status: string; diff: string[] };
}

interface TestResult {
  name: string;
  pass: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`  ${msg}`);
}

function recordResult(name: string, pass: boolean, message: string, details?: string) {
  results.push({ name, pass, message, details });
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`    ${details}`);
  }
}

function parseJsonFromOutput(output: string): any | null {
  try {
    const jsonMatch = output.match(/\{[\s\S]*"validation"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

function cleanupArchive() {
  if (fs.existsSync(ARCHIVE_PATH)) {
    fs.unlinkSync(ARCHIVE_PATH);
  }
}

// eslint-disable-next-line require-await
async function runXcliCommand(
  cmd: string,
  jsonMode = true,
  cleanup = true
): { output: string; json: any | null } {
  if (cleanup) {
    cleanupArchive();
  }
  const fullCmd = jsonMode
    ? `npx tsx xcli/bin/xcli.ts ${cmd} --json --session validation-test`
    : `npx tsx xcli/bin/xcli.ts ${cmd} --session validation-test`;

  const outputFile = `/tmp/xcli-test-${Date.now()}.txt`;
  const cmdWithRedirect = `${fullCmd} > ${outputFile} 2>&1`;
  try {
    execSync(cmdWithRedirect, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'inherit',
    });
  } catch {
    // Command might fail (e.g., nonexistent command), ignore error
  }
  const output = fs.readFileSync(outputFile, 'utf-8');
  fs.unlinkSync(outputFile);

  const json = jsonMode ? parseJsonFromOutput(output) : null;
  return { output, json };
}

async function test_L1_functional() {
  log('测试 L1 功能验证');
  cleanupArchive();

  const { json } = await runXcliCommand('08-search scrape');

  if (!json) {
    recordResult('L1 功能 - 解析', false, '无法解析 JSON 输出');
    return;
  }

  const validation = json.validation as ValidationReport;
  const l1 = validation.l1_functional;

  if (l1.status === 'pass') {
    recordResult('L1 功能 - 正常执行', true, `status=${l1.status}, ${l1.detail}`);
  } else if (l1.status === 'fail') {
    recordResult('L1 功能 - 正常执行', false, `status=${l1.status}, ${l1.detail}`);
  } else {
    recordResult('L1 功能 - 正常执行', false, `status=${l1.status} (应该只有 pass/fail)`);
  }

  if (json.success && json.data?.data?.length > 0) {
    recordResult('L1 功能 - data 非空', true, `data 条数: ${json.data.data.length}`);
  } else {
    recordResult('L1 功能 - data 非空', false, 'data 为空或结构异常');
  }
}

async function test_L2_behavior_native() {
  log('测试 L2 行为验证 - 原生 Playwright');
  cleanupArchive();

  const { json } = await runXcliCommand('08-search scrape');

  if (!json) {
    recordResult('L2 行为 - 解析', false, '无法解析 JSON 输出');
    return;
  }

  const validation = json.validation as ValidationReport;
  const l2 = validation.l2_behavior;

  recordResult(
    'L2 行为 - mdGap 计算',
    l2.mdGap > 0 && l2.mdGap < 10000,
    `mdGap=${l2.mdGap}ms`,
    '应该 >0 且 <10000ms'
  );

  recordResult(
    'L2 行为 - offsetStd 计算',
    l2.offsetStd >= 0 && l2.offsetStd <= 1,
    `offsetStd=${l2.offsetStd}`,
    '应该 0~1'
  );

  recordResult(
    'L2 行为 - instantClickRatio 计算',
    l2.instantClickRatio >= 0 && l2.instantClickRatio <= 1,
    `instantClickRatio=${l2.instantClickRatio}`,
    '应该 0~1'
  );

  const statusMapping: Record<string, string> = {
    pass: 'HUMAN (< 15)',
    warn: 'SUSPICIOUS (15-44)',
    fail: 'BOT (≥ 45)',
  };

  recordResult(
    'L2 行为 - 状态映射',
    ['pass', 'warn', 'fail'].includes(l2.status),
    `status=${l2.status}, score=${l2.score}`,
    `应该: ${statusMapping[l2.status]}`
  );
}

async function test_L3_regression_first() {
  log('测试 L3 回归验证 - 首次执行');
  cleanupArchive();

  const { json } = await runXcliCommand('08-search scrape');

  if (!json) {
    recordResult('L3 回归 - 首次执行', false, '无法解析 JSON 输出');
    return;
  }

  const validation = json.validation as ValidationReport;
  const l3 = validation.l3_regression;

  if (l3.status === 'skip' && l3.diff.some((d) => d.includes('首次执行'))) {
    recordResult('L3 回归 - 首次执行', true, `status=${l3.status}, diff=[${l3.diff.join(', ')}]`);
  } else {
    recordResult('L3 回归 - 首次执行', false, `status=${l3.status}, 应该是 skip`);
  }
}

async function test_L3_regression_second() {
  log('测试 L3 回归验证 - 第二次执行');

  const { json } = await runXcliCommand('08-search scrape', true, false);

  if (!json) {
    recordResult('L3 回归 - 第二次执行', false, '无法解析 JSON 输出');
    return;
  }

  const validation = json.validation as ValidationReport;
  const l3 = validation.l3_regression;

  if (l3.status === 'skip') {
    recordResult('L3 回归 - 第二次执行', true, `status=${l3.status} (只有1条历史记录，正常)`);
  } else {
    recordResult('L3 回归 - 第二次执行', false, `status=${l3.status}, 应该是 skip`);
  }
}

async function test_L3_regression_third() {
  log('测试 L3 回归验证 - 第三次执行');

  const { json } = await runXcliCommand('08-search scrape', true, false);

  if (!json) {
    recordResult('L3 回归 - 第三次执行', false, '无法解析 JSON 输出');
    return;
  }

  const validation = json.validation as ValidationReport;
  const l3 = validation.l3_regression;

  if (l3.status === 'pass' || l3.status === 'warn') {
    recordResult('L3 回归 - 第三次执行', true, `status=${l3.status}, diff=[${l3.diff.join(', ')}]`);
  } else if (l3.status === 'skip') {
    recordResult(
      'L3 回归 - 第三次执行',
      false,
      `status=${l3.status}, 应该是 pass/warn`,
      '应该有2条以上历史记录'
    );
  }
}

// eslint-disable-next-line require-await
async function test_archive_storage() {
  log('测试 Archive 存储');

  if (!fs.existsSync(ARCHIVE_PATH)) {
    recordResult('Archive - 文件存在', false, '文件不存在');
    return;
  }

  const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8'));

  if (archive.commands && archive.commands.length >= 3) {
    recordResult('Archive - 命令记录', true, `共 ${archive.commands.length} 条记录`);
  } else {
    recordResult('Archive - 命令记录', false, `仅 ${archive.commands.length} 条记录，应该 >=3`);
  }

  const lastCmd = archive.commands[archive.commands.length - 1];
  if (lastCmd.validation) {
    recordResult('Archive - validation 存储', true, '包含验证结果');
  } else {
    recordResult('Archive - validation 存储', false, '缺少 validation 字段');
  }

  if (lastCmd.toolCalls && lastCmd.toolCalls.length > 0) {
    const hasTimestamp = lastCmd.toolCalls.every((tc: any) => tc.timestamp !== undefined);
    recordResult(
      'Archive - toolCall timestamp',
      hasTimestamp,
      `共 ${lastCmd.toolCalls.length} 条 toolCall`
    );
  } else {
    recordResult('Archive - toolCall 记录', false, '无 toolCall 记录');
  }
}

async function test_validation_format() {
  log('测试验证报告格式（text 模式）');

  const { output } = await runXcliCommand('08-search scrape', false, false);

  const hasValidationSection = output.includes('验证报告');
  const hasL1 = output.includes('L1 功能');
  const hasL2 = output.includes('L2 行为');
  const hasL3 = output.includes('L3 回归');

  if (hasValidationSection) {
    recordResult('验证报告 - 区块', true, '包含验证报告区块');
  } else {
    recordResult('验证报告 - 区块', false, '缺少验证报告区块');
  }

  if (hasL1 && hasL2 && hasL3) {
    recordResult('验证报告 - 完整性', true, '包含 L1/L2/L3 三层');
  } else {
    recordResult(
      '验证报告 - 完整性',
      false,
      `缺少: ${[hasL1 ? '' : 'L1', hasL2 ? '' : 'L2', hasL3 ? '' : 'L3']
        .filter(Boolean)
        .join(', ')}`
    );
  }

  const hasScore = output.includes('score=');
  const hasMdGap = output.includes('md→click gap');
  const hasOffsetStd = output.includes('offset std');

  if (hasScore && hasMdGap && hasOffsetStd) {
    recordResult('验证报告 - L2 指标', true, '包含 score/mdGap/offsetStd');
  } else {
    recordResult(
      '验证报告 - L2 指标',
      false,
      `缺少: ${[hasScore ? '' : 'score', hasMdGap ? '' : 'mdGap', hasOffsetStd ? '' : 'offsetStd']
        .filter(Boolean)
        .join(', ')}`
    );
  }
}

async function test_L1_fail_case() {
  log('测试 L1 功能验证 - 失败情况');

  cleanupArchive();
  const { output } = await runXcliCommand('08-search nonexistent', false);

  if (
    output.includes('Unknown site command') ||
    output.includes('Unknown command') ||
    output.includes('not found') ||
    output.includes('not a function')
  ) {
    recordResult('L1 失败 - 命令不存在', true, '返回错误提示（非 JSON 格式）');
  } else {
    recordResult('L1 失败 - 命令不存在', false, '未返回错误提示');
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  三层验证管线自动化测试              ║');
  console.log('╚════════════════════════════════════════╝\n');

  await test_L1_functional();
  console.log('');

  await test_L1_fail_case();
  console.log('');

  await test_L2_behavior_native();
  console.log('');

  await test_L3_regression_first();
  console.log('');

  await test_L3_regression_second();
  console.log('');

  await test_L3_regression_third();
  console.log('');

  await test_archive_storage();
  console.log('');

  await test_validation_format();
  console.log('');

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;

  console.log('╔════════════════════════════════════════╗');
  console.log('║  测试结果汇总                           ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`总计: ${results.length} 项测试`);
  console.log(`✓ 通过: ${passCount}`);
  console.log(`✗ 失败: ${failCount}`);

  if (failCount === 0) {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
