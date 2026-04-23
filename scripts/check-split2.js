// 详细检查 split 的实际行为
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 提取 split 那行的精确内容
const lines = code.split('\n');
let splitLine = '';
let splitLineNum = 0;
lines.forEach((line, idx) => {
  if (line.includes('split') && line.includes('classAttr')) {
    console.log(`Line ${idx + 1}: ${JSON.stringify(line)}`);
    if (line.includes('RegExp')) {
      splitLine = line;
      splitLineNum = idx + 1;
    }
  }
});

// 精确检查 split 行的内容
console.log('\n=== Exact split line content ===');
console.log('splitLine:', splitLine);
console.log('splitLine includes "\\\\s":', splitLine.includes('\\\\s'));
console.log('splitLine includes "\\s":', splitLine.includes('\\s'));

// 提取 RegExp 参数
const regexMatch = splitLine.match(/new RegExp\("([^"]+)"\)/);
if (regexMatch) {
  console.log('\n=== Regex content ===');
  console.log('Regex string:', regexMatch[1]);
  console.log('Regex string length:', regexMatch[1].length);
  console.log('First char code:', regexMatch[1].charCodeAt(0));

  // 创建正则并测试
  const regex = new RegExp(regexMatch[1]);
  console.log('Regex source:', regex.source);
  console.log('Regex test on space:', regex.test(' '));

  const testStr = 'b7ef425131 e65bb8178d b5f4517f4e';
  const result = testStr.split(regex);
  console.log('Split result:', result);
}