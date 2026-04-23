// 检查 TypeScript 编译后的代码
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 找到 split 那行
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('split') && line.includes('RegExp')) {
    console.log(`Line ${idx + 1}: ${JSON.stringify(line)}`);
  }
});

// 提取并检查实际的正则
const reMatch = code.match(/split\(new RegExp\("([^"]+)"\)\)/);
if (reMatch) {
  console.log('\nRegex pattern found:', reMatch[1]);
  console.log('Regex pattern JSON:', JSON.stringify(reMatch[1]));
  console.log('First few char codes:', [...reMatch[1]].map(c => c.charCodeAt(0)));
}