// 验证模板中正则的实际行为
import { getStructureExtractorForTest } from '../src/server/commands/structure-extractor.js';

const code = getStructureExtractorForTest();

// 提取模板中的正则
const reMatch = code.match(/split\(new RegExp\("([^"]+)"\)\)/);
if (reMatch) {
  const regexStr = reMatch[1];
  console.log('Template regex string:', regexStr);
  console.log('Template regex string length:', regexStr.length);
  console.log('Template regex string JSON:', JSON.stringify(regexStr));

  // 创建正则并测试
  const regex = new RegExp(regexStr);
  console.log('\nCreated regex source:', regex.source);

  // 测试 split
  const testStr = "b7ef425131 e65bb8178d b5f4517f4e";
  const splitResult = testStr.split(regex);
  console.log('Split result:', splitResult);

  // 期望的结果应该是 ["b7ef425131", "e65bb8178d", "b5f4517f4e"]
  if (splitResult.length === 3 && splitResult[0] === "b7ef425131") {
    console.log('\n✓ Split is working correctly!');
  } else {
    console.log('\n✗ Split is NOT working correctly!');
  }
}