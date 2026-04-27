import type { Recording } from '../types.js';
import { generateJSScript } from '../script-gen/js.js';
import { generatePythonScript } from '../script-gen/python.js';
import { generateBashScript } from '../script-gen/bash.js';

export async function handleConvert(commandInput: string, _args: string[]): Promise<void> {
  const parts = commandInput.split(' ');
  const filePath = parts[1];
  const outputPath = parts[2];

  if (!filePath || !outputPath) {
    console.error('用法: convert <录制文件> <输出脚本>');
    console.error('');
    console.error('示例:');
    console.error('  convert recording.yaml replay.js');
    console.error('  convert recording.yaml replay.py');
    process.exit(1);
  }

  console.log('🔄 转换录制文件...');
  console.log(`📄 输入: ${filePath}`);
  console.log(`📄 输出: ${outputPath}`);

  const yaml = await import('yaml');
  const fs = await import('fs');
  const path = await import('path');

  const content = fs.readFileSync(filePath, 'utf-8');
  const recording: Recording = yaml.parse(content);

  const ext = path.extname(outputPath).toLowerCase();
  let script = '';

  if (ext === '.py') {
    script = generatePythonScript(recording);
  } else if (ext === '.sh') {
    script = generateBashScript(recording);
  } else {
    script = generateJSScript(recording);
  }

  fs.writeFileSync(outputPath, script);
  fs.chmodSync(outputPath, '755');

  console.log('');
  console.log('✅ 转换完成');
  console.log(`📊 事件数量: ${(recording.events || []).length}`);
  console.log(`📄 起始URL: ${recording.startUrl}`);
  console.log('');
  console.log('执行方式:');
  if (ext === '.js') {
    console.log(`  node ${outputPath}`);
  } else if (ext === '.py') {
    console.log(`  python ${outputPath}`);
  } else {
    console.log(`  ./${outputPath}`);
  }

  process.exit(0);
}
