#!/usr/bin/env node
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  ensureStorage,
  loadSessionInfo,
  deleteSessionInfo,
  listSessions,
  isProcessRunning,
  getSocketPath,
  tip,
  sendRequest,
  executeCommandChain,
  getOrCreateSession,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RecordingEvent {
  type: string;
  selector?: string;
  tagName?: string;
  data?: { value?: string; key?: string; x?: number; y?: number };
  timestamp?: number;
  pageState?: { url?: string; title?: string };
}

interface Recording {
  startUrl: string;
  events?: RecordingEvent[];
}

async function main() {
  ensureStorage();

  const args = process.argv.slice(2);
  let sessionName = 'default';
  let cdpEndpoint = '';
  let commandInput = '';
  let jsonMode = false;
  let quietMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session' || args[i] === '-s') {
      sessionName = args[++i];
    } else if (args[i] === '--cdp') {
      cdpEndpoint = args[++i];
      // If cdpEndpoint is just a port number, convert to WebSocket URL
      if (cdpEndpoint && /^\d+$/.test(cdpEndpoint)) {
        try {
          const res = await fetch(`http://localhost:${cdpEndpoint}/json/version`);
          const data = await res.json();
          cdpEndpoint = data.webSocketDebuggerUrl;
        } catch (e) {
          console.error(`无法连接到 CDP 端口 ${cdpEndpoint}`);
          process.exit(1);
        }
      }
    } else if (args[i] === '--json' || args[i] === '-j') {
      jsonMode = true;
    } else if (args[i] === '--quiet' || args[i] === '-q') {
      quietMode = true;
    } else if (!args[i].startsWith('-') && !commandInput) {
      commandInput = args.slice(i).join(' ');
      break;
    }
  }

  if (commandInput === 'kill') {
    const sessions = listSessions();
    for (const s of sessions) {
      if (s.serverPid && isProcessRunning(s.serverPid)) {
        try {
          process.kill(s.serverPid, 'SIGTERM');
        } catch {}
      }
      if (s.pid && isProcessRunning(s.pid)) {
        try {
          process.kill(s.pid, 'SIGTERM');
        } catch {}
      }
      deleteSessionInfo(s.name);
    }
    console.log(`Killed ${sessions.length} sessions`);
    process.exit(0);
  }

  if (commandInput === 'session') {
    const action = args[args.indexOf('session') + 1];
    if (action === 'list' || action === 'ls') {
      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log('No sessions');
      } else {
        for (const s of sessions) {
          const running = isProcessRunning(s.serverPid);
          console.log(
            `${s.name} ${running ? '(running)' : '(stopped)'} - ${s.isCDP ? 'CDP' : 'local'}`
          );
        }
      }
      process.exit(0);
    }
  }

  if (commandInput === 'close') {
    const info = loadSessionInfo(sessionName);
    if (info) {
      const socketPath = getSocketPath(sessionName);
      if (info.serverPid && isProcessRunning(info.serverPid) && socketPath) {
        try {
          await sendRequest(socketPath, { action: 'close' });
        } catch {
          process.kill(info.serverPid, 'SIGTERM');
        }
      }
      if (info.pid && isProcessRunning(info.pid)) {
        try {
          process.kill(info.pid, 'SIGTERM');
        } catch {}
      }
      deleteSessionInfo(sessionName);
      console.log(`Session '${sessionName}' closed`);
    } else {
      console.log(`Session '${sessionName}' not found`);
    }
    process.exit(0);
  }

  if (commandInput.startsWith('record')) {
    const parts = commandInput.split(' ');
    const subCommand = parts[1];

    // Use .js extension when running compiled code, .ts for development
    const ext = __filename.endsWith('.js') ? '.js' : '.ts';
    const serverPath = path.join(__dirname, `mpage-server${ext}`);
    const sessionInfo = await getOrCreateSession(serverPath, sessionName, cdpEndpoint);
    if (!sessionInfo) {
      console.error('Failed to create session');
      process.exit(1);
    }

    if (subCommand === 'start') {
      let url = '';
      let name = '';

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url' || args[i] === '-u') {
          url = args[++i];
        } else if (args[i] === '--name' || args[i] === '-n') {
          name = args[++i];
        }
      }

      const result = await sendRequest(sessionInfo.socketPath, {
        action: 'record_start',
        url,
        name,
      });

      if (result.success) {
        console.log('🎬 开始录制...');
        if (url) console.log(`📍 URL: ${url}`);
        console.log('💡 使用 "mpage record stop" 停止录制');
      } else {
        console.error('启动录制失败:', result.error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (subCommand === 'stop') {
      let outputPath = '';

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
          outputPath = args[++i];
        }
      }

      const result = await sendRequest(sessionInfo.socketPath, {
        action: 'record_stop',
        outputPath,
      });

      if (result.success) {
        const content = result.content as { eventCount: number; path: string };
        console.log('⏹️  录制已停止');
        console.log(`📊 事件数量: ${content.eventCount}`);
        console.log(`📄 已保存到: ${content.path}`);
      } else {
        console.error('停止录制失败:', result.error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (subCommand === 'status') {
      const result = await sendRequest(sessionInfo.socketPath, {
        action: 'record_status',
      });

      const content = result.content as {
        isRecording: boolean;
        eventCount: number;
        duration: number;
      } | null;
      if (content?.isRecording) {
        console.log('🎬 正在录制...');
        console.log(`📊 已记录事件: ${content.eventCount}`);
        console.log(`⏱️  持续时间: ${Math.round(content.duration / 1000)}s`);
      } else {
        console.log('当前没有进行中的录制');
      }
      process.exit(0);
    }

    console.log('Usage: mpage record <command>');
    console.log('');
    console.log('Commands:');
    console.log('  start --url <url>     Start recording');
    console.log('  stop --output <path>  Stop recording and save');
    console.log('  status                Show recording status');
    console.log('  filter <in> <out>     Filter recording file');
    console.log('  extract <in>         Extract key events for LLM');
    console.log('  convert <in> <out>   Convert to executable script');
    process.exit(0);
  }

  if (commandInput.startsWith('convert')) {
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
    const recording = yaml.parse(content);

    // Determine output format
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

  if (commandInput.startsWith('extract')) {
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

    // Extract key events
    const keyEvents: RecordingEvent[] = [];
    const eventTypes: Record<string, number> = {};

    for (const event of recording.events || []) {
      const type = event.type;
      eventTypes[type] = (eventTypes[type] || 0) + 1;

      // Keep only user interaction events
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

    // Build summary
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

    // Output as JSON for LLM consumption
    const outputPath = filePath.replace('.yaml', '-summary.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log('');
    console.log(`✅ 已生成 LLM 摘要: ${outputPath}`);

    process.exit(0);
  }

  if (commandInput.startsWith('filter')) {
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
      // 调试事件
      'panel_item_added',
      'panel_debug',
      'panel_items_count',
      'panel_debug_detail',
      // 位置记录
      'element_at_position',
      'element_at_click',
      // 自动触发的事件
      'navigation',
      'panel_appeared',
      'panel_items',
      'blur',
      'focus',
      'dom_change',
      'tab_open',
      // 鼠标推断事件（保留 mousemove 用于轨迹模拟）
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

  if (commandInput.startsWith('replay')) {
    const parts = commandInput.split(' ');
    const filePath = parts[1];

    if (!filePath) {
      console.error('请指定录制文件路径');
      process.exit(1);
    }

    let slowMo = 0;
    let stopOnError = true;

    for (let i = args.indexOf('replay') + 2; i < args.length; i++) {
      if (args[i] === '--slow-mo') {
        slowMo = parseInt(args[++i], 10);
      } else if (args[i] === '--continue-on-error') {
        stopOnError = false;
      }
    }

    // Use .js extension when running compiled code, .ts for development
    const ext = __filename.endsWith('.js') ? '.js' : '.ts';
    const serverPath = path.join(__dirname, `mpage-server${ext}`);
    const sessionInfo = await getOrCreateSession(serverPath, sessionName, cdpEndpoint);
    if (!sessionInfo) {
      console.error('Failed to create session');
      process.exit(1);
    }

    console.log('🔄 开始回放...');
    console.log(`📄 文件: ${filePath}`);

    const result = await sendRequest(
      sessionInfo.socketPath,
      {
        action: 'replay',
        filePath,
        options: { slowMo, stopOnError },
      },
      300000 // 5 minutes timeout for replay
    );

    if (result.success) {
      const content = result.content as {
        eventsPlayed: number;
        totalEvents: number;
        duration: number;
        errors?: Array<{ eventIndex: number; event: { type: string }; error: string }>;
      };
      console.log('✅ 回放完成');
      console.log(`📊 成功: ${content.eventsPlayed}/${content.totalEvents}`);
      console.log(`⏱️  耗时: ${Math.round(content.duration / 1000)}s`);

      if (content.errors && content.errors.length > 0) {
        console.log('');
        console.log('❌ 错误:');
        for (const err of content.errors) {
          console.log(`  [${err.eventIndex}] ${err.event.type}: ${err.error}`);
        }
      }
    } else {
      console.error('❌ 回放失败:', result.error);
      process.exit(1);
    }
    process.exit(0);
  }

  if (!commandInput) {
    console.log('Usage: mpage [options] <command>');
    console.log('');
    console.log('Options:');
    console.log('  --session, -s <name>  Session name (default: default)');
    console.log('  --cdp <endpoint>      CDP endpoint to connect');
    console.log('');
    console.log('Commands:');
    console.log('  kill                  Kill all sessions');
    console.log('  close                 Close current session');
    console.log('  session list          List all sessions');
    console.log('  record start          Start recording user actions');
    console.log('  record stop           Stop recording and save');
    console.log('  record status         Show recording status');
    console.log('  replay <file>         Replay recorded actions');
    console.log('');
    console.log('Examples:');
    console.log('  mpage "goto https://example.com && title"');
    console.log("  mpage --session test \"goto baidu.com && fill '#kw' 'hello'\"");
    console.log('  mpage --cdp ws://localhost:8080/client "url"');
    console.log('  mpage record start --url https://example.com');
    console.log('  mpage record stop --output my-recording.yaml');
    console.log('  mpage replay my-recording.yaml');
    process.exit(0);
  }

  // Use .js extension when running compiled code, .ts for development
  const ext = __filename.endsWith('.js') ? '.js' : '.ts';
  const serverPath = path.join(__dirname, `mpage-server${ext}`);
  const session = await getOrCreateSession(serverPath, sessionName, cdpEndpoint);
  if (!session) {
    console.error('Failed to create session');
    process.exit(1);
  }

  const result = await executeCommandChain(
    (data) => sendRequest(session.socketPath, data),
    commandInput,
    jsonMode
  );

  if (result.output) {
    console.log(result.output);
  }

  if (result.tips && !quietMode) {
    tip(result.tips);
  }
}

// Script generation functions

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function generateJSScript(recording: Recording): string {
  const events = recording.events || [];

  // Aggregate consecutive input events - ONLY keep the LAST input value
  // Skip all intermediate input events and keydowns
  const aggregatedEvents: RecordingEvent[] = [];
  let lastInputEvent: RecordingEvent | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type === 'input') {
      // Update last input event with latest value
      lastInputEvent = event;
    } else if (event.type === 'keydown') {
      // Skip keydown events
    } else {
      // If we have a pending input event, add it first
      if (lastInputEvent) {
        aggregatedEvents.push(lastInputEvent);
        lastInputEvent = null;
      }
      aggregatedEvents.push(event);
    }
  }
  // Add the final input event
  if (lastInputEvent) {
    aggregatedEvents.push(lastInputEvent);
  }

  let script = `#!/usr/bin/env node
// Auto-generated replay script from mpage
// Start URL: ${recording.startUrl}
// Original events: ${events.length}, Aggregated: ${aggregatedEvents.length}

import { WebSocket } from 'ws';

const CDP_URL = process.env.CDP_URL || 'ws://localhost:9221/devtools/browser/xxx';
const START_URL = '${recording.startUrl}';

async function main() {
  const ws = new WebSocket(CDP_URL);
  let msgId = 1;
  let targetId = null;
  
  ws.on('open', async () => {
    console.log('Connected to CDP');
    
    // Get page target
    ws.send(JSON.stringify({ 
      id: msgId++, 
      method: 'Target.getTargets' 
    }));
  });
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.id === 2 && targetId) {
      // Attached to target, now replay
      console.log('Starting replay...');
      
      // Navigate to start URL first
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Page.navigate',
        params: { url: START_URL }
      }));
      
      // Wait for page load
      await sleep(5000);
      
      // Wait for page to be ready
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.readyState',
          awaitPromise: true
        }
      }));
      
      await sleep(1000);
`;

  // Add events
  for (const event of aggregatedEvents) {
    script += generateJSEvent(event);
  }

  script += `
      console.log('Replay completed!');
      ws.close();
    }
    
    if (msg.id === 1 && msg.result?.targetInfos) {
      // Find existing page or create new one
      const page = msg.result.targetInfos.find(t => t.type === 'page');
      if (page) {
        console.log('Found page:', page.url);
        targetId = page.targetId;
        // Attach to the page target
        ws.send(JSON.stringify({
          id: 2,
          method: 'Target.attachToTarget',
          params: { 
            targetId: page.targetId,
            flatten: true 
          }
        }));
      } else {
        console.log('No page found, creating new one...');
        ws.send(JSON.stringify({
          id: 2,
          method: 'Target.createTarget',
          params: { url: START_URL }
        }));
      }
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
`;

  return script;
}

function generateJSEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `
      // Click: ${event.selector}
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) {
              el.focus();
              el.click();
            }
          \`
        }
      }));
      await sleep(100);
`;

    case 'input':
      return `
      // Input: ${event.selector} - value: '${escapeString(event.data?.value || '')}'
      // First clear the input (Ctrl+A then Delete)
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) { el.focus(); }
          \`
        }
      }));
      await sleep(50);
      // Select all and delete
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 }
      }));
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 }
      }));
      await sleep(50);
      // Insert the text
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.insertText',
        params: {
          text: '${escapeString(event.data?.value || '')}'
        }
      }));
      await sleep(100);
`;

    case 'keydown':
      if (event.data?.key === 'Enter') {
        return `
        // Press Enter: ${event.selector}
        ws.send(JSON.stringify({
          id: msgId++,
          method: 'Runtime.evaluate',
          params: {
            expression: \`
              const el = document.querySelector('${event.selector}');
              if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
            \`
          }
        }));
        await sleep(100);
`;
      }
      return '';

    case 'mousemove':
      return `
      // Mouse move: (${event.data?.x}, ${event.data?.y})
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchMouseEvent',
        params: {
          type: 'mouseMoved',
          x: ${event.data?.x},
          y: ${event.data?.y}
        }
      }));
      await sleep(16);
`;

    case 'hover_enter':
      return `
      // Hover: ${event.selector}
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) { el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); }
          \`
        }
      }));
      await sleep(100);
`;

    default:
      return '';
  }
}

function generatePythonScript(recording: Recording): string {
  const events = recording.events || [];
  let script = `#!/usr/bin/env python3
# Auto-generated replay script from mpage
# Start URL: ${recording.startUrl}

import asyncio
import websockets
import json
import time

CDP_URL = "ws://localhost:9221/devtools/browser/xxx"

async def send_cdp(ws, method, params=None):
    msg = {"id": 1, "method": method}
    if params:
        msg["params"] = params
    await ws.send(json.dumps(msg))
    return json.loads(await ws.recv())

async def main():
    async with websockets.connect(CDP_URL) as ws:
        print("Connected to CDP")
        
        # Get page target
        result = await send_cdp(ws, "Target.getTargets")
        page = next((t for t in result["result"]["targetInfos"] if t["type"] == "page"), None)
        
        if page:
            print(f"Found page: {page['url']}")
            
            # Connect to page
            async with websockets.connect(page["webSocketDebuggerUrl"]) as page_ws:
                # Navigate to start URL
                await send_cdp(page_ws, "Page.navigate", {"url": "${recording.startUrl}"})
                await asyncio.sleep(2)
                
                # Replay events
`;

  // Add events
  for (const event of events) {
    script += generatePythonEvent(event);
  }

  script += `
                print("Replay completed!")

if __name__ == "__main__":
    asyncio.run(main())
`;

  return script;
}

function generatePythonEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `                # Click: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.click(); }
                    '''
                })
                await asyncio.sleep(0.1)
`;

    case 'input':
      return `                # Input: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.value = '${event.data?.value || ''}'; el.dispatchEvent(new Event('input', { bubbles: true })); }
                    '''
                })
                await asyncio.sleep(0.1)
`;

    case 'keydown':
      if (event.data?.key === 'Enter') {
        return `                # Press Enter: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
                    '''
                })
                await asyncio.sleep(0.1)
`;
      }
      return '';

    case 'mousemove':
      return `                # Mouse move: (${event.data?.x}, ${event.data?.y})
                await send_cdp(page_ws, "Input.dispatchMouseEvent", {
                    "type": "mouseMoved",
                    "x": ${event.data?.x},
                    "y": ${event.data?.y}
                })
                await asyncio.sleep(0.016)
`;

    default:
      return '';
  }
}

function generateBashScript(recording: Recording): string {
  const events = recording.events || [];
  let script = `#!/bin/bash
# Auto-generated replay script from mpage
# Start URL: ${recording.startUrl}

CDP_URL="http://localhost:9221"

# Navigate to start URL
echo "Navigating to ${recording.startUrl}..."
curl -s "$CDP_URL/json/new?${recording.startUrl}" > /dev/null
sleep 2

`;

  // Add events as curl commands
  for (const event of events) {
    script += generateBashEvent(event);
  }

  script += `
echo "Replay completed!"
`;

  return script;
}

function generateBashEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `# Click: ${event.selector}
curl -s "$CDP_URL/json/execute" -d '{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "document.querySelector('${event.selector}').click()"
  }
}' > /dev/null
sleep 0.1
`;

    case 'input':
      return `# Input: ${event.selector}
curl -s "$CDP_URL/json/execute" -d '{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "document.querySelector('${event.selector}').value = '${event.data?.value || ''}'"
  }
}' > /dev/null
sleep 0.1
`;

    default:
      return '';
  }
}

main().catch(console.error);
