import type { RecordingEvent } from '../types.js';

export async function handleExtract(commandInput: string, _args: string[]): Promise<void> {
  const parts = commandInput.split(' ');
  const filePath = parts[1];

  if (!filePath) {
    console.error('用法: extract <录制文件>');
    console.error('');
    console.error('示例:');
    console.error('  extract recording.yaml');
    process.exit(1);
  }

  console.log('🔍 分析录制文件...');
  console.log(`📄 文件: ${filePath}`);

  const yaml = await import('yaml');
  const fs = await import('fs');

  const content = fs.readFileSync(filePath, 'utf-8');
  const recording = yaml.parse(content);

  const keyEvents: RecordingEvent[] = [];
  const eventTypes: Record<string, number> = {};

  for (const event of recording.events || []) {
    const type = event.type;
    eventTypes[type] = (eventTypes[type] || 0) + 1;

    if (['click', 'input', 'keydown', 'hover_enter', 'hover_leave'].includes(type)) {
      keyEvents.push({
        type: event.type,
        selector: event.selector,
        tagName: event.tagName,
        data: event.data,
        timestamp: event.timestamp,
        pageState: {
          url: event.pageState?.url,
          title: event.pageState?.title,
        },
      });
    }
  }

  const summary = {
    startUrl: recording.startUrl,
    totalEvents: (recording.events || []).length,
    keyEventsCount: keyEvents.length,
    eventTypes,
    operations: keyEvents.map((e, i) => ({
      step: i + 1,
      type: e.type,
      selector: e.selector,
      tagName: e.tagName,
      data: e.data,
      url: e.pageState?.url,
    })),
  };

  console.log('');
  console.log('📊 分析结果:');
  console.log(`   起始URL: ${summary.startUrl}`);
  console.log(`   总事件数: ${summary.totalEvents}`);
  console.log(`   关键事件: ${summary.keyEventsCount}`);
  console.log('');
  console.log('📝 事件类型统计:');
  for (const [type, count] of Object.entries(eventTypes)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log('');
  console.log('🎯 关键操作序列:');
  for (const op of summary.operations) {
    console.log(`   ${op.step}. ${op.type} → ${op.selector || op.tagName}`);
  }

  const outputPath = filePath.replace('.yaml', '-summary.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log('');
  console.log(`✅ 已生成 LLM 摘要: ${outputPath}`);

  process.exit(0);
}
