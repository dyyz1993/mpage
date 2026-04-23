// 检查 tsx 编译后的实际代码
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 查找 split 相关代码
const idx = code.indexOf('split');
console.log('First split at:', idx);
console.log('Context:', JSON.stringify(code.substring(idx, idx + 50)));

// 查找 split(/\s+/) 和 split(new RegExp
const idx1 = code.indexOf('split(/\s+/');
const idx2 = code.indexOf('split(new RegExp');
console.log('\nsplit(/\s+/) at:', idx1);
console.log('split(new RegExp at:', idx2);

// 直接检查字符
const splitLineIdx = code.indexOf('.split');
if (splitLineIdx !== -1) {
  const line = code.substring(splitLineIdx, splitLineIdx + 40);
  console.log('\nActual split code:', JSON.stringify(line));
}

// 检查字符代码
const str = 'split(/\\s+/)';
const actualStr = code.substring(idx, idx + 12);
console.log('\nExpected:', str);
console.log('Actual:', actualStr);
console.log('Match:', str === actualStr);
console.log('Actual char codes:', [...actualStr].map(c => c.charCodeAt(0)));