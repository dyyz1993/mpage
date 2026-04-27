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
import { handleConvert } from './commands/convert.js';
import { handleExtract } from './commands/extract.js';
import { handleFilter } from './commands/filter.js';
import { handleReplay } from './commands/replay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      await deleteSessionInfo(s.name);
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
      await deleteSessionInfo(sessionName);
      console.log(`Session '${sessionName}' closed`);
    } else {
      console.log(`Session '${sessionName}' not found`);
    }
    process.exit(0);
  }

  if (commandInput.startsWith('record')) {
    const parts = commandInput.split(' ');
    const subCommand = parts[1];

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
    return handleConvert(commandInput, args);
  }

  if (commandInput.startsWith('extract')) {
    return handleExtract(commandInput, args);
  }

  if (commandInput.startsWith('filter')) {
    return handleFilter(commandInput, args);
  }

  if (commandInput.startsWith('replay')) {
    return handleReplay(commandInput, args, __filename, sessionName, cdpEndpoint);
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

main().catch(console.error);
