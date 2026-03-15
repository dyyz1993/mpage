import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const simpleDir = path.join(__dirname, '../tests/fixtures/layouts');
const mediumDir = path.join(__dirname, '../tests/fixtures/layouts-medium');
const detailedDir = path.join(__dirname, '../tests/fixtures/layouts-detailed');

function compareAll() {
  const files = fs.readdirSync(simpleDir).filter((f) => f.endsWith('.txt'));

  console.log('========== 三版本对比报告 ==========\n');

  const results: Array<{
    name: string;
    simple: number;
    medium: number;
    detailed: number;
    simpleLines: number;
    mediumLines: number;
    detailedLines: number;
  }> = [];

  for (const file of files) {
    const name = file.replace('.txt', '');
    const simplePath = path.join(simpleDir, file);
    const mediumPath = path.join(mediumDir, file);
    const detailedPath = path.join(detailedDir, file);

    const simpleContent = fs.existsSync(simplePath) ? fs.readFileSync(simplePath, 'utf-8') : '';
    const mediumContent = fs.existsSync(mediumPath) ? fs.readFileSync(mediumPath, 'utf-8') : '';
    const detailedContent = fs.existsSync(detailedPath)
      ? fs.readFileSync(detailedPath, 'utf-8')
      : '';

    results.push({
      name,
      simple: simpleContent.length,
      medium: mediumContent.length,
      detailed: detailedContent.length,
      simpleLines: simpleContent.split('\n').filter((l) => l.trim()).length,
      mediumLines: mediumContent.split('\n').filter((l) => l.trim()).length,
      detailedLines: detailedContent.split('\n').filter((l) => l.trim()).length,
    });
  }

  results.sort((a, b) => b.medium - a.medium);

  console.log('【大小对比】');
  console.log('  网站                简单版    中等版    详细版    中等/简单  详细/中等');
  console.log('  ──────────────────────────────────────────────────────────────────────');

  for (const r of results.slice(0, 25)) {
    const ratioSM = r.simple > 0 ? (r.medium / r.simple).toFixed(2) : '-';
    const ratioMD = r.medium > 0 ? (r.detailed / r.medium).toFixed(2) : '-';
    console.log(
      `  ${r.name.padEnd(20)} ${String(r.simple).padStart(6)}B  ${String(r.medium).padStart(6)}B  ${String(r.detailed).padStart(6)}B    ${ratioSM.padStart(6)}    ${ratioMD.padStart(6)}`
    );
  }

  const totalSimple = results.reduce((sum, r) => sum + r.simple, 0);
  const totalMedium = results.reduce((sum, r) => sum + r.medium, 0);
  const totalDetailed = results.reduce((sum, r) => sum + r.detailed, 0);

  console.log('\n【总计】');
  console.log(`  简单版总大小: ${(totalSimple / 1024).toFixed(1)}KB`);
  console.log(`  中等版总大小: ${(totalMedium / 1024).toFixed(1)}KB`);
  console.log(`  详细版总大小: ${(totalDetailed / 1024).toFixed(1)}KB`);
  console.log(`  中等版/简单版: ${(totalMedium / totalSimple).toFixed(2)}x`);
  console.log(`  详细版/中等版: ${(totalDetailed / totalMedium).toFixed(2)}x`);

  console.log('\n【小红书三版本对比】');
  const xhs = results.find((r) => r.name === 'xiaohongshu');
  if (xhs) {
    console.log(`  简单版: ${xhs.simple}B, ${xhs.simpleLines} 行`);
    console.log(`  中等版: ${xhs.medium}B, ${xhs.mediumLines} 行`);
    console.log(`  详细版: ${xhs.detailed}B, ${xhs.detailedLines} 行`);
  }

  console.log('\n========================================');
}

compareAll();
