// 直接检查 tsx 编译后的代码
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 找到 split 那行
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('split') && line.includes('classAttr')) {
    console.log(`Line ${idx + 1}: ${JSON.stringify(line)}`);
  }
});

// 直接搜索 split 的模式
const idx = code.indexOf('split(/\s+/');
const idx2 = code.indexOf('split(new RegExp');
console.log('\nsplit(/\s+/) found at:', idx);
console.log('split(new RegExp found at:', idx2);

if (idx !== -1) {
  console.log('Context:', JSON.stringify(code.substring(idx - 30, idx + 60)));
}