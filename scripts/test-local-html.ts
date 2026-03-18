#!/usr/bin/env tsx
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 读取本地 HTML 文件
  const htmlPath =
    '/Users/xuyingzhou/Project/study-node-ts/mpage/tests/fixtures/websites/xiaohongshu-search.html';
  const htmlContent = readFileSync(htmlPath, 'utf-8');

  console.log('📄 加载本地 HTML 文件...');

  // 清理 HTML 中的脚本和事件处理程序
  const cleanedHtml = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  await page.setContent(cleanedHtml, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  console.log('🔍 提取页面结构...\n');

  // 获取结构提取器代码
  const extractorCode = getStructureExtractorForTest();

  // 注入提取器函数并执行
  interface ExtractorResult {
    layout: unknown;
    yaml: string;
    error?: string;
  }

  const result = await page.evaluate(
    (params: { code: string }): ExtractorResult => {
      const fn = eval('(' + params.code + ')');
      return fn({ selector: 'body' });
    },
    { code: extractorCode }
  );

  console.log('📋 页面结构大纲:\n');
  console.log(result.yaml);

  // 统计信息
  if (result.error) {
    console.log('\n❌ 错误:', result.error);
  }

  await browser.close();
}

main().catch(console.error);
