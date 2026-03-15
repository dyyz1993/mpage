import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const simpleDir = path.join(__dirname, '../tests/fixtures/layouts');
const detailedDir = path.join(__dirname, '../tests/fixtures/layouts-detailed');

function compareLayouts() {
  const files = fs.readdirSync(simpleDir).filter((f) => f.endsWith('.txt'));

  console.log('========== 简单版 vs 详细版 对比报告 ==========\n');

  const results: Array<{
    name: string;
    simpleSize: number;
    detailedSize: number;
    ratio: number;
    simpleLines: number;
    detailedLines: number;
    missingKeywords: string[];
  }> = [];

  const allKeywords = new Map<string, number>();

  for (const file of files) {
    const name = file.replace('.txt', '');
    const simplePath = path.join(simpleDir, file);
    const detailedPath = path.join(detailedDir, file);

    if (!fs.existsSync(detailedPath)) continue;

    const simpleContent = fs.readFileSync(simplePath, 'utf-8');
    const detailedContent = fs.readFileSync(detailedPath, 'utf-8');

    const simpleLines = simpleContent.split('\n').filter((l) => l.trim()).length;
    const detailedLines = detailedContent.split('\n').filter((l) => l.trim()).length;

    const simpleSize = simpleContent.length;
    const detailedSize = detailedContent.length;

    const keywordMatches = detailedContent.match(/\{([^}]+)\}/g) || [];
    const keywords: string[] = [];

    for (const match of keywordMatches) {
      const inner = match.slice(1, -1);
      const parts = inner.split(' | ').flatMap((p) => p.split(','));
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && !trimmed.match(/^[🔍📝×i:b:l:\d]/u) && !trimmed.match(/^\d/)) {
          keywords.push(trimmed);
          allKeywords.set(trimmed, (allKeywords.get(trimmed) || 0) + 1);
        }
      }
    }

    const missingKeywords: string[] = [];
    const simpleKeywords = new Set(
      (simpleContent.match(/\{([^}]+)\}/g) || [])
        .flatMap((m) => m.slice(1, -1).split(','))
        .map((s) => s.trim())
        .filter((s) => s && !s.match(/^[🔍📝×i:b:l:\d]/u))
    );

    for (const kw of keywords) {
      if (!simpleKeywords.has(kw)) {
        missingKeywords.push(kw);
      }
    }

    results.push({
      name,
      simpleSize,
      detailedSize,
      ratio: detailedSize / simpleSize,
      simpleLines,
      detailedLines,
      missingKeywords: [...new Set(missingKeywords)].slice(0, 10),
    });
  }

  results.sort((a, b) => b.ratio - a.ratio);

  console.log('【大小对比】');
  console.log('  网站                简单版    详细版    比例');
  console.log('  ─────────────────────────────────────────────');

  for (const r of results.slice(0, 20)) {
    console.log(
      `  ${r.name.padEnd(20)} ${String(r.simpleSize).padStart(6)}B  ${String(r.detailedSize).padStart(6)}B  ${r.ratio.toFixed(2)}x`
    );
  }

  console.log('\n【详细版新增的关键词统计】');
  const sortedKeywords = [...allKeywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [kw, count] of sortedKeywords) {
    console.log(`  ${kw}: ${count} 次`);
  }

  console.log('\n【每个网站缺失的关键词】');
  for (const r of results.filter((r) => r.missingKeywords.length > 0).slice(0, 10)) {
    console.log(`  ${r.name}: ${r.missingKeywords.join(', ')}`);
  }

  const totalSimple = results.reduce((sum, r) => sum + r.simpleSize, 0);
  const totalDetailed = results.reduce((sum, r) => sum + r.detailedSize, 0);

  console.log('\n【总计】');
  console.log(`  简单版总大小: ${(totalSimple / 1024).toFixed(1)}KB`);
  console.log(`  详细版总大小: ${(totalDetailed / 1024).toFixed(1)}KB`);
  console.log(`  平均压缩比: ${(totalDetailed / totalSimple).toFixed(2)}x`);

  console.log('\n========================================');
}

compareLayouts();
