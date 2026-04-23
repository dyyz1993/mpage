// 重新生成所有结构文件 - 使用动态选择器
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor';
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

async function extractStructure(htmlPath, baseName) {
  const extractorCode = getStructureExtractorForTest();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const cleanedHtml = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  await page.setContent(cleanedHtml, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  let selector = 'body';
  if (baseName === 'booking') {
    selector = 'header';
  }

  const result = await page.evaluate(function(params) {
    try {
      var fn = eval('(' + params.code + ')');
      return fn({ selector: params.selector });
    } catch (e) {
      return { error: e.message, yaml: '' };
    }
  }, { code: extractorCode, selector });

  await browser.close();
  return result.yaml || '';
}

async function main() {
  const websitesDir = 'tests/fixtures/websites';
  const structuresDir = 'tests/fixtures/structures';

  const files = readdirSync(websitesDir).filter(f => f.endsWith('.html'));
  console.log(`Found ${files.length} HTML files`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const htmlPath = join(websitesDir, file);
    const baseName = basename(file, '.html');
    const structPath = join(structuresDir, baseName + '.yaml');

    try {
      console.log(`Processing: ${file}...`);
      const yaml = await extractStructure(htmlPath, baseName);
      writeFileSync(structPath, yaml, 'utf-8');
      console.log(`  Saved: ${structPath}`);
      success++;
    } catch (e) {
      console.error(`  Error: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);