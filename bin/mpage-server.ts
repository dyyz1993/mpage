#!/usr/bin/env node
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright-core';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  getSessionPath,
  getSocketPath,
  saveSessionInfo,
  deleteSessionInfo,
  isProcessRunning,
} from '../src/index.js';
import { executePageCommand, hasCommand } from '../src/server/commands/index.js';
import type { SessionInfo } from '../src/types.js';

const sessionName = process.argv[2] || 'default';
const cdpEndpoint = process.argv[3] || '';

interface Session {
  name: string;
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  cdpEndpoint: string;
  pid: number;
  isCDP: boolean;
  createdAt: number;
  lastUsed: number;
}

const session: Session = {
  name: sessionName,
  browser: null,
  context: null,
  page: null,
  cdpEndpoint: cdpEndpoint,
  pid: 0,
  isCDP: !!cdpEndpoint,
  createdAt: Date.now(),
  lastUsed: Date.now(),
};

function saveCurrentSessionInfo(): void {
  const info: SessionInfo = {
    name: session.name,
    cdpEndpoint: session.cdpEndpoint,
    pid: session.pid,
    serverPid: process.pid,
    socketPath: getSocketPath(session.name),
    isCDP: session.isCDP,
    createdAt: session.createdAt,
    lastUsed: session.lastUsed,
  };
  saveSessionInfo(info);
}

async function initSession(): Promise<boolean> {
  try {
    if (cdpEndpoint) {
      session.browser = await chromium.connectOverCDP(cdpEndpoint);
      session.cdpEndpoint = cdpEndpoint;
      session.isCDP = true;

      await new Promise((r) => setTimeout(r, 500));

      const contexts = session.browser.contexts();
      session.context = contexts[0] || (await session.browser.newContext());

      session.page = await session.context.newPage();
      console.error(`[mpage-server] CDP session '${sessionName}' created new page`);
    } else {
      const cdpPort = 9222 + Math.floor(Math.random() * 1000);
      const chromiumPath = '/Applications/Chromium.app/Contents/MacOS/Chromium';
      const executable = fs.existsSync(chromiumPath) ? chromiumPath : 'chromium';
      const userDataDir = path.join(getSessionPath(session.name), 'user-data');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const browserProcess = spawn(
        executable,
        [
          `--remote-debugging-port=${cdpPort}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
        ],
        { detached: true, stdio: 'ignore' }
      );

      session.pid = browserProcess.pid!;
      browserProcess.unref();

      await new Promise((r) => setTimeout(r, 2000));
      session.browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
      session.cdpEndpoint = `http://localhost:${cdpPort}`;

      const contexts = session.browser.contexts();
      session.context = contexts[0] || (await session.browser.newContext());

      let pages = session.context.pages();
      if (pages.length === 0) {
        await new Promise((r) => setTimeout(r, 500));
        pages = session.context.pages();
      }

      if (pages.length === 0) {
        session.page = await session.context.newPage();
      } else {
        const nonBlankPage = pages.find((p) => p.url() !== 'about:blank' && p.url() !== '');
        session.page = nonBlankPage || pages[0];
      }
    }

    saveCurrentSessionInfo();
    return true;
  } catch (e) {
    console.error(`Failed to init session: ${e}`);
    return false;
  }
}

async function closeSession(): Promise<boolean> {
  if (session.browser) {
    try {
      await session.browser.close();
    } catch {}
  }

  if (session.pid !== 0 && isProcessRunning(session.pid)) {
    try {
      process.kill(session.pid, 'SIGTERM');
    } catch {}
  }

  deleteSessionInfo(session.name);
  return true;
}

async function handleCommand(cmd: string, args: Record<string, unknown>): Promise<unknown> {
  let page = session.page;
  if (!page || page.isClosed()) {
    if (session.context) {
      try {
        session.page = await session.context.newPage();
        page = session.page;
        console.error(`[mpage-server] Recreated page for session '${session.name}'`);
      } catch {
        throw new Error('No page available and failed to create new page');
      }
    } else {
      throw new Error('No page available');
    }
  }

  if (!page) {
    throw new Error('No page available');
  }

  session.lastUsed = Date.now();
  saveCurrentSessionInfo();

  if (!hasCommand(cmd)) {
    throw new Error(`Unknown command: ${cmd}`);
  }

  return executePageCommand(page, cmd, args);
}

async function handleConnection(conn: net.Socket) {
  let buffer = '';

  conn.on('data', async (data) => {
    buffer += data.toString();

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const req = JSON.parse(line);
        const { action, command, args = {} } = req;

        if (action === 'close') {
          await closeSession();
          conn.write(JSON.stringify({ success: true }) + '\n');
          setTimeout(() => process.exit(0), 100);
          return;
        }

        if (action === 'status') {
          conn.write(
            JSON.stringify({
              success: true,
              session: {
                name: session.name,
                url: session.page?.url() || 'about:blank',
                isCDP: session.isCDP,
              },
            }) + '\n'
          );
          return;
        }

        if (command) {
          try {
            const result = await handleCommand(command, args);
            const response: { success: boolean; content?: unknown; error?: string; tips?: string } =
              {
                success: true,
                content: result,
              };
            conn.write(JSON.stringify(response) + '\n');
          } catch (e: unknown) {
            const response: { success: boolean; content?: unknown; error?: string; tips?: string } =
              {
                success: false,
                error: (e as Error).message,
              };
            conn.write(JSON.stringify(response) + '\n');
          }
          return;
        }

        conn.write(JSON.stringify({ success: true }) + '\n');
      } catch (e: unknown) {
        conn.write(JSON.stringify({ success: false, error: (e as Error).message }) + '\n');
      }
    }
  });

  conn.on('error', () => {});
}

async function main() {
  const success = await initSession();
  if (!success) {
    console.error('Failed to initialize session');
    process.exit(1);
  }

  const socketPath = getSocketPath(sessionName);

  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  const server = net.createServer(handleConnection);

  server.listen(socketPath, () => {
    console.log(`MPage Session '${sessionName}' listening on ${socketPath} (PID: ${process.pid})`);
  });

  process.on('SIGTERM', async () => {
    await closeSession();
    process.exit(0);
  });
}

main().catch(console.error);
