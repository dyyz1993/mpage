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
    } else if (args[i] === '--json' || args[i] === '-j') {
      jsonMode = true;
    } else if (args[i] === '--quiet' || args[i] === '-q') {
      quietMode = true;
    } else if (!args[i].startsWith('-') && !commandInput) {
      commandInput = args[i];
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
    console.log('');
    console.log('Examples:');
    console.log('  mpage "goto https://example.com && title"');
    console.log("  mpage --session test \"goto baidu.com && fill '#kw' 'hello'\"");
    console.log('  mpage --cdp ws://localhost:8080/client "url"');
    process.exit(0);
  }

  const serverPath = path.join(__dirname, 'mpage-server.ts');
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

  if (result.error) {
    process.exit(1);
  }
}

main().catch(console.error);
