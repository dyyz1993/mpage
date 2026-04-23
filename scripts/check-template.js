// 检查模板字符串中的实际过滤逻辑
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

console.log('Total code length:', code.length);

// 找到 filter 函数的位置
const filterStart = code.indexOf('.filter(function(c)');
console.log('\n=== Looking for filter function ===');
console.log('Found filter at:', filterStart);

// 提取 filter 函数后的代码（约 1500 字符）
const filterSection = code.substring(filterStart, filterStart + 1500);
console.log('\n=== Filter section ===');
console.log(filterSection);

// 检查纯哈希检测的行
const hashCheck = '/^[a-z]?[0-9a-fA-F]{5,}$/i';
console.log('\n=== Searching for hash check ===');
console.log('Looking for:', hashCheck);
console.log('Found:', code.includes(hashCheck));

// 找到该行并显示上下文
const lines = code.split('\n');
console.log('\n=== Lines containing hash check ===');
lines.forEach((line, idx) => {
  if (line.includes('0-9a-fA-F') || line.includes('纯哈希') || line.includes('pure hash')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});