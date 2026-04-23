// 检查模板中的 split
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 查找 split
const idx = code.indexOf('split(/\s+/');
console.log('Found split at:', idx);
if (idx !== -1) {
  console.log('Context:', JSON.stringify(code.substring(idx - 20, idx + 50)));
}

// 也搜索其他可能的 split
const idx2 = code.indexOf('split(new RegExp');
console.log('\nFound RegExp split at:', idx2);
if (idx2 !== -1) {
  console.log('Context:', JSON.stringify(code.substring(idx2 - 20, idx2 + 60)));
}