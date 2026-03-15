import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const layoutsDir = path.join(__dirname, '../tests/fixtures/layouts');

function analyzeLayouts() {
  const files = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.txt'));

  console.log('========== 布局结构分析报告 ==========\n');

  const stats = {
    total: files.length,
    withSearch: 0,
    withForm: 0,
    withNav: 0,
    withSidebar: 0,
    withHeader: 0,
    withFooter: 0,
    withMain: 0,
    withHidden: 0,
    issues: [] as string[],
  };

  const regionCounts: Record<string, number> = {};
  const selectorPatterns: Record<string, number> = {};
  const sizeDistribution: Record<string, number> = {
    '<1KB': 0,
    '1-10KB': 0,
    '10-50KB': 0,
    '50-100KB': 0,
    '>100KB': 0,
  };

  for (const file of files) {
    const name = file.replace('.txt', '');
    const content = fs.readFileSync(path.join(layoutsDir, file), 'utf-8');
    const lines = content.split('\n');

    let nodeCount = 0;
    let hasSearch = false;
    let hasForm = false;
    let hasNav = false;
    let hasSidebar = false;
    let hasHeader = false;
    let hasFooter = false;
    let hasMain = false;
    let hasHidden = false;

    for (const line of lines) {
      if (line.includes('└──') || line.includes('├──')) {
        nodeCount++;
      }

      if (line.includes('🔍')) hasSearch = true;
      if (line.includes('📝')) hasForm = true;
      if (line.includes('[NAV]')) hasNav = true;
      if (line.includes('[SIDEBAR]')) hasSidebar = true;
      if (line.includes('[HEADER]')) hasHeader = true;
      if (line.includes('[FOOTER]')) hasFooter = true;
      if (line.includes('[MAIN]')) hasMain = true;
      if (line.includes('[HIDDEN]')) hasHidden = true;

      const regionMatch = line.match(/\[(\w+)\]/g);
      if (regionMatch) {
        for (const r of regionMatch) {
          const region = r.replace(/[[\]]/g, '');
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        }
      }

      const selectorMatch = line.match(/\.[a-z][a-z0-9-]*/gi);
      if (selectorMatch) {
        for (const s of selectorMatch) {
          selectorPatterns[s] = (selectorPatterns[s] || 0) + 1;
        }
      }

      const sizeMatch = line.match(/\{.*(\d+\.?\d*[KMB]?).*\}/);
      if (sizeMatch) {
        const sizeStr = sizeMatch[1];
        if (sizeStr.includes('KB')) {
          const kb = parseFloat(sizeStr);
          if (kb < 10) sizeDistribution['1-10KB']++;
          else if (kb < 50) sizeDistribution['10-50KB']++;
          else if (kb < 100) sizeDistribution['50-100KB']++;
          else sizeDistribution['>100KB']++;
        } else if (sizeStr.includes('MB')) {
          sizeDistribution['>100KB']++;
        }
      }
    }

    if (hasSearch) stats.withSearch++;
    if (hasForm) stats.withForm++;
    if (hasNav) stats.withNav++;
    if (hasSidebar) stats.withSidebar++;
    if (hasHeader) stats.withHeader++;
    if (hasFooter) stats.withFooter++;
    if (hasMain) stats.withMain++;
    if (hasHidden) stats.withHidden++;

    if (nodeCount > 50) {
      stats.issues.push(`${name}: 节点过多 (${nodeCount}个)`);
    }
  }

  console.log('【基础统计】');
  console.log(`  总网站数: ${stats.total}`);
  console.log(
    `  有搜索: ${stats.withSearch} (${Math.round((stats.withSearch / stats.total) * 100)}%)`
  );
  console.log(`  有表单: ${stats.withForm} (${Math.round((stats.withForm / stats.total) * 100)}%)`);
  console.log(`  有导航: ${stats.withNav} (${Math.round((stats.withNav / stats.total) * 100)}%)`);
  console.log(
    `  有侧边栏: ${stats.withSidebar} (${Math.round((stats.withSidebar / stats.total) * 100)}%)`
  );
  console.log(
    `  有头部: ${stats.withHeader} (${Math.round((stats.withHeader / stats.total) * 100)}%)`
  );
  console.log(
    `  有底部: ${stats.withFooter} (${Math.round((stats.withFooter / stats.total) * 100)}%)`
  );
  console.log(
    `  有主内容: ${stats.withMain} (${Math.round((stats.withMain / stats.total) * 100)}%)`
  );
  console.log(
    `  有隐藏元素: ${stats.withHidden} (${Math.round((stats.withHidden / stats.total) * 100)}%)`
  );

  console.log('\n【区域识别统计】');
  const sortedRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
  for (const [region, count] of sortedRegions) {
    console.log(`  ${region}: ${count} 次`);
  }

  console.log('\n【元素大小分布】');
  for (const [range, count] of Object.entries(sizeDistribution)) {
    console.log(`  ${range}: ${count} 个`);
  }

  console.log('\n【常见选择器模式】');
  const sortedSelectors = Object.entries(selectorPatterns)
    .filter(([s]) => s.length > 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  for (const [selector, count] of sortedSelectors) {
    console.log(`  ${selector}: ${count} 次`);
  }

  if (stats.issues.length > 0) {
    console.log('\n【问题列表】');
    for (const issue of stats.issues) {
      console.log(`  ⚠️ ${issue}`);
    }
  }

  console.log('\n========================================');
}

analyzeLayouts();
