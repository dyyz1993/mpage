import type { RecordingEvent } from '../types.js';

export async function handleFilter(commandInput: string, args: string[]): Promise<void> {
  const parts = commandInput.split(' ');
  const filePath = parts[1];
  const outputPath = parts[2];

  if (!filePath || !outputPath) {
    console.error('用法: filter <输入文件> <输出文件> [--exclude-types=type1,type2...]');
    console.error('');
    console.error('示例:');
    console.error('  filter input.yaml output.yaml');
    console.error('  filter input.yaml output.yaml --exclude-types=panel_item_added,panel_debug');
    process.exit(1);
  }

  let excludeTypes: string[] = [
    'panel_item_added',
    'panel_debug',
    'panel_items_count',
    'panel_debug_detail',
    'element_at_position',
    'element_at_click',
    'navigation',
    'panel_appeared',
    'panel_items',
    'blur',
    'focus',
    'dom_change',
    'tab_open',
    'click_inferred',
    'pointerup',
    'pointerdown',
    'mouseup',
    'mousedown',
  ];

  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--exclude-types=')) {
      const types = args[i].replace('--exclude-types=', '').split(',');
      excludeTypes = types;
    }
  }

  console.log('🔧 过滤录制文件...');
  console.log(`📄 输入: ${filePath}`);
  console.log(`📄 输出: ${outputPath}`);
  console.log(`🚫 排除类型: ${excludeTypes.join(', ')}`);

  const yaml = await import('yaml');
  const fs = await import('fs');

  const content = fs.readFileSync(filePath, 'utf-8');
  const recording = yaml.parse(content);

  const originalCount = (recording.events || []).length;
  const filteredEvents = (recording.events || []).filter((event: RecordingEvent) => {
    return !excludeTypes.includes(event.type);
  });
  const filteredCount = filteredEvents.length;

  recording.events = filteredEvents;

  fs.writeFileSync(outputPath, yaml.stringify(recording));

  console.log('');
  console.log('✅ 过滤完成');
  console.log(`📊 原始事件: ${originalCount}`);
  console.log(`📊 过滤后: ${filteredCount}`);
  console.log(
    `📊 减少: ${originalCount - filteredCount} (${Math.round(((originalCount - filteredCount) / originalCount) * 100)}%)`
  );

  process.exit(0);
}
