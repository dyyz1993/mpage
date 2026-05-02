#!/usr/bin/env node

/**
 * 快速测试脚本 - 测试几个关键插件
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const XCLI_BIN = join(__dirname, '../xcli/dist/bin/xcli.js');
const WORKING_DIR = join(__dirname, '..');

async function testPlugin(pluginId, command) {
  return new Promise((resolve) => {
    const proc = spawn(XCLI_BIN, [pluginId, command], { cwd: WORKING_DIR });

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

async function main() {
  console.log('🚀 快速测试插件...\n');

  const tests = [
    { plugin: '01-static', command: 'scrape' },
    { plugin: '01-static', command: 'verify' },
    { plugin: '02-extract-urls', command: 'scrape' },
    { plugin: '03-extract-content', command: 'scrape' },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`📦 测试: ${test.plugin} ${test.command}`);
    const result = await testPlugin(test.plugin, test.command);

    if (result.success) {
      console.log(`  ✅ 成功`);
      // 尝试解析 JSON 输出
      try {
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.status) {
            console.log(`     状态: ${data.status}`);
            if (data.errors && data.errors.length > 0) {
              console.log(`     错误: ${data.errors.length} 个`);
            }
          }
          if (data.tips && data.tips.length > 0) {
            console.log(`     Tips: ${data.tips[0]}`);
          }
        }
      } catch (e) {
        console.log(`  ⚠️  无法解析输出`);
      }
    } else {
      console.log(`  ❌ 失败: ${result.stderr}`);
    }

    console.log('');
    results.push({ ...test, ...result });
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n📊 结果: ${passed}/${results.length} 通过`);
}

main().catch((err) => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
