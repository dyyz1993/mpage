// 检查模板中 split 的实际代码
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 找到 split 的那一行
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('split') && line.includes('RegExp')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // 显示实际的字符
    const match = line.match(/split\(new RegExp\("([^"]+)"\)\)/);
    if (match) {
      console.log('  Regex string:', match[1]);
      console.log('  Regex string JSON:', JSON.stringify(match[1]));
      // 测试这个正则
      const testStr = "b7ef425131 e65bb8178d b5f4517f4e";
      const result = testStr.split(new RegExp(match[1]));
      console.log('  Split result:', result);
    }
  }
});

// 直接搜索 split( 附近的内容
const splitIdx = code.indexOf('.split(new RegExp');
if (splitIdx !== -1) {
  const snippet = code.substring(splitIdx, splitIdx + 60);
  console.log('\n=== Split snippet ===');
  console.log(snippet);
}