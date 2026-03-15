#!/usr/bin/env node
import { chromium, type Browser, type Page, type BrowserContext } from "playwright-core";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import {
  DEFAULT_STORAGE,
  getSessionPath,
  getSocketPath,
  saveSessionInfo,
  deleteSessionInfo,
  isProcessRunning
} from "../src/index.js";
import type { SessionInfo } from "../src/types.js";

const sessionName = process.argv[2] || "default";
const cdpEndpoint = process.argv[3] || "";

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
      
      await new Promise(r => setTimeout(r, 500));
      
      const contexts = session.browser.contexts();
      session.context = contexts[0] || await session.browser.newContext();
      
      session.page = await session.context.newPage();
      console.error(`[mpage-server] CDP session '${sessionName}' created new page`);
    } else {
      const cdpPort = 9222 + Math.floor(Math.random() * 1000);
      const chromiumPath = "/Applications/Chromium.app/Contents/MacOS/Chromium";
      const executable = fs.existsSync(chromiumPath) ? chromiumPath : "chromium";
      const userDataDir = path.join(getSessionPath(session.name), "user-data");
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const browserProcess = spawn(executable, [
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
      ], { detached: true, stdio: "ignore" });
      
      session.pid = browserProcess.pid!;
      browserProcess.unref();
      
      await new Promise(r => setTimeout(r, 2000));
      session.browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
      session.cdpEndpoint = `http://localhost:${cdpPort}`;
      
      const contexts = session.browser.contexts();
      session.context = contexts[0] || await session.browser.newContext();
      
      let pages = session.context.pages();
      if (pages.length === 0) {
        await new Promise(r => setTimeout(r, 500));
        pages = session.context.pages();
      }
      
      if (pages.length === 0) {
        session.page = await session.context.newPage();
      } else {
        const nonBlankPage = pages.find(p => p.url() !== "about:blank" && p.url() !== "");
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
      process.kill(session.pid, "SIGTERM");
    } catch {}
  }

  deleteSessionInfo(session.name);
  return true;
}

async function executeCommand(cmd: string, args: Record<string, unknown>): Promise<unknown> {
  let page = session.page;
  if (!page || page.isClosed()) {
    if (session.context) {
      try {
        session.page = await session.context.newPage();
        page = session.page;
        console.error(`[mpage-server] Recreated page for session '${session.name}'`);
      } catch {
        throw new Error("No page available and failed to create new page");
      }
    } else {
      throw new Error("No page available");
    }
  }

  if (!page) {
    throw new Error("No page available");
  }

  const p = page;
  session.lastUsed = Date.now();
  saveCurrentSessionInfo();

  const commands: Record<string, () => Promise<unknown>> = {
    goto: async () => { await p.goto(args.url as string, { waitUntil: (args.waitUntil as "load" | "domcontentloaded" | "networkidle") || "load", timeout: (args.timeout as number) || 30000 }); return { url: p.url() }; },
    click: async () => { await p.click(args.selector as string, args as Record<string, unknown>); return { selector: args.selector }; },
    fill: async () => { await p.fill(args.selector as string, args.value as string, args as Record<string, unknown>); return { selector: args.selector, value: args.value }; },
    type: async () => { 
      await p.type(args.selector as string, args.text as string, { timeout: (args.timeout as number) || 10000, ...args }); 
      return { selector: args.selector, text: args.text }; 
    },
    press: async () => { await p.press(args.selector as string, args.key as string, args as Record<string, unknown>); return { key: args.key }; },
    hover: async () => { await p.hover(args.selector as string, args as Record<string, unknown>); return { selector: args.selector }; },
    scroll: async () => {
      if (args.selector) { await p.locator(args.selector as string).scrollIntoViewIfNeeded(); return { scrolledTo: args.selector }; }
      await p.evaluate(`window.scrollTo(${args.x ?? 0}, ${args.y ?? 0})`);
      return { x: args.x ?? 0, y: args.y ?? 0 };
    },
    wait: async () => { await p.waitForTimeout(args.timeout as number); return { waited: args.timeout }; },
    screenshot: async () => {
      const filename = (args.path as string) || `screenshot-${Date.now()}.png`;
      const filePath = path.join(DEFAULT_STORAGE, filename);
      await p.screenshot({ ...args, path: filePath });
      return { path: filePath };
    },
    evaluate: async () => { 
      const result = await p.evaluate(args.expression as string);
      return { result }; 
    },
    title: async () => { const title = await p.title(); return { title }; },
    url: async () => { return { url: p.url() }; },
    query: async () => {
      const selector = args.selector as string;
      const result = await p.evaluate((s) => {
        const elements = Array.from(document.querySelectorAll(s));
        return elements.slice(0, 20).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          id: el.id || "",
          className: (el.className || "").toString().slice(0, 100),
          text: (el.textContent || "").trim().slice(0, 200),
          href: (el as HTMLAnchorElement).href || "",
        }));
      }, selector);
      return { elements: result, count: result.length };
    },
    find: async () => {
      const text = args.text as string;
      const tag = (args.tag as string) || "*";
      const result = await p.evaluate((opts) => {
        const allElements = Array.from(document.querySelectorAll(opts.tag));
        const matches: Element[] = [];
        
        const excludeTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'HEAD', 'HTML', 'TITLE']);
        
        const containing = allElements.filter(el => {
          if (excludeTags.has(el.tagName)) return false;
          const content = el.textContent || "";
          if (opts.exact) return content.trim() === opts.text;
          return content.includes(opts.text);
        });
        
        for (const el of containing) {
          const hasMoreSpecificChild = containing.some(other => 
            other !== el && el.contains(other)
          );
          if (!hasMoreSpecificChild) {
            matches.push(el);
          }
        }
        
        return matches.slice(0, 20).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          id: el.id || "",
          className: (el.className || "").toString().slice(0, 100),
          text: (el.textContent || "").trim().slice(0, 200),
          href: (el as HTMLAnchorElement).href || "",
          selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(" ")[0]}` : el.tagName.toLowerCase(),
        }));
      }, { text, tag, exact: args.exact });
      return { elements: result, count: result.length };
    },
    html: async () => {
      let html: string;
      if (args.selector) {
        html = await p.innerHTML(args.selector as string);
      } else {
        html = await p.content();
      }
      
      if (args.clean) {
        html = html
          .replace(/\s*data-v-[a-f0-9]+="[^"]*"/gi, '')
          .replace(/\s*data-v-[a-f0-9]+/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s*class=""/g, '')
          .replace(/\s*style=""/g, '')
          .replace(/\s*id=""/g, '')
          .replace(/<div\s*><\/div>/g, '')
          .replace(/<span\s*><\/span>/g, '')
          .replace(/<div\s*>\s*<\/div>/g, '')
          .replace(/<span\s*>\s*<\/span>/g, '')
          .trim();
      }
      
      return { html };
    },
    text: async () => { const text = await p.textContent((args.selector as string) || "body"); return { text }; },
    a11y: async () => {
      const selector = (args.selector as string) || 'body';
      const format = (args.format as string) || 'yaml';
      const snapshot = await p.evaluate(`
        (function(selector) {
          function walk(node, depth) {
            if (!node || node.nodeType !== 1) return null;
            
            var tag = node.tagName;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'HEAD', 'HTML'].indexOf(tag) !== -1) return null;
            
            var role = node.getAttribute('role') || 
              (tag === 'BUTTON' ? 'button' :
               tag === 'A' ? 'link' :
               tag === 'INPUT' ? 'textbox' :
               tag === 'TEXTAREA' ? 'textbox' :
               tag === 'SELECT' ? 'combobox' :
               tag === 'IMG' ? 'img' :
               tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6' ? 'heading' :
               tag === 'UL' || tag === 'OL' ? 'list' :
               tag === 'LI' ? 'listitem' :
               tag === 'NAV' ? 'navigation' :
               tag === 'MAIN' ? 'main' :
               tag === 'HEADER' ? 'banner' :
               tag === 'FOOTER' ? 'contentinfo' :
               tag === 'FORM' ? 'form' :
               tag === 'TABLE' ? 'table' :
               tag === 'TR' ? 'row' :
               tag === 'TD' || tag === 'TH' ? 'cell' :
               tag === 'SPAN' ? 'text' : '');
            
            var directText = '';
            for (var i = 0; i < node.childNodes.length; i++) {
              var child = node.childNodes[i];
              if (child.nodeType === 3) {
                directText += child.textContent || '';
              }
            }
            directText = directText.trim();
            
            var name = node.getAttribute('aria-label') ||
              node.getAttribute('alt') ||
              node.getAttribute('title') ||
              (tag === 'INPUT' || tag === 'TEXTAREA' ? node.getAttribute('placeholder') : '') ||
              (directText ? directText.slice(0, 100) : '');
            
            var cssSelector = '';
            if (node.id) {
              cssSelector = '#' + node.id;
            } else if (node.className && typeof node.className === 'string') {
              var classes = node.className.trim().split(/\\s+/).filter(function(c) { return c && !c.startsWith('reds-'); });
              if (classes.length > 0) {
                cssSelector = '.' + classes.slice(0, 2).join('.');
              }
            }
            
            var result = {};
            if (role) result.role = role;
            if (name) result.name = name;
            result.tag = tag.toLowerCase();
            if (cssSelector) result.selector = cssSelector;
            if (node.id) result.id = node.id;
            if (node.getAttribute('href')) result.href = node.getAttribute('href');
            if (node.disabled) result.disabled = true;
            
            var children = [];
            for (var i = 0; i < node.children.length; i++) {
              var childResult = walk(node.children[i], depth + 1);
              if (childResult) children.push(childResult);
            }
            
            if (children.length > 0) {
              result.children = children;
            }
            
            if (!role && !name && children.length === 0) return null;
            
            return result;
          }
          
          function toYaml(node, indent) {
            if (!node) return '';
            var spaces = '  '.repeat(indent);
            var lines = [];
            
            var header = '';
            if (node.role) {
              header = node.role;
              if (node.name) header += ' "' + node.name + '"';
            } else if (node.name) {
              header = node.name;
            } else {
              header = node.tag;
            }
            
            if (node.selector && node.selector.includes('.active')) {
              header = '✓ ' + header;
            }
            
            lines.push(spaces + '- ' + header);
            
            if (node.selector && node.selector !== '.' + node.tag) {
              lines.push(spaces + '  selector: ' + node.selector);
            }
            if (node.href) {
              lines.push(spaces + '  href: ' + node.href);
            }
            if (node.disabled) {
              lines.push(spaces + '  disabled: true');
            }
            
            if (node.children && node.children.length > 0) {
              for (var i = 0; i < node.children.length; i++) {
                lines.push(toYaml(node.children[i], indent + 1));
              }
            }
            
            return lines.join('\\n');
          }
          
          var root = document.querySelector(selector) || document.body;
          var result = walk(root, 0);
          
          return {
            json: result,
            yaml: result ? toYaml(result, 0) : ''
          };
        })('${selector}')
      `);
      
      if (format === 'json') {
        return { snapshot: (snapshot as { json: unknown; yaml: string }).json };
      }
      return { snapshot: (snapshot as { json: unknown; yaml: string }).yaml };
    },
    snapshot: async () => {
      const selector = (args.selector as string) || 'body';
      const snapshot = await p.locator(selector).ariaSnapshot();
      return { snapshot };
    },
  };

  const aliases: Record<string, string> = {
    findByText: "find",
    waitForTimeout: "wait",
  };

  const resolvedCmd = aliases[cmd] || cmd;
  if (!commands[resolvedCmd]) throw new Error(`Unknown command: ${cmd}`);
  return commands[resolvedCmd]();
}

async function handleConnection(conn: net.Socket) {
  let buffer = "";
  
  conn.on("data", async (data) => {
    buffer += data.toString();
    
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const req = JSON.parse(line);
        const { action, command, args = {} } = req;

        if (action === "close") {
          await closeSession();
          conn.write(JSON.stringify({ success: true }) + "\n");
          setTimeout(() => process.exit(0), 100);
          return;
        }

        if (action === "status") {
          conn.write(JSON.stringify({ 
            success: true, 
            session: {
              name: session.name,
              url: session.page?.url() || "about:blank",
              isCDP: session.isCDP,
            }
          }) + "\n");
          return;
        }

        if (command) {
          try {
            const result = await executeCommand(command, args);
            const response: { success: boolean; content?: unknown; error?: string; tips?: string } = {
              success: true,
              content: result
            };
            conn.write(JSON.stringify(response) + "\n");
          } catch (e: unknown) {
            const response: { success: boolean; content?: unknown; error?: string; tips?: string } = {
              success: false,
              error: (e as Error).message
            };
            conn.write(JSON.stringify(response) + "\n");
          }
          return;
        }

        conn.write(JSON.stringify({ success: true }) + "\n");
      } catch (e: unknown) {
        conn.write(JSON.stringify({ success: false, error: (e as Error).message }) + "\n");
      }
    }
  });
  
  conn.on("error", () => {});
}

async function main() {
  const success = await initSession();
  if (!success) {
    console.error("Failed to initialize session");
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

  process.on("SIGTERM", async () => {
    await closeSession();
    process.exit(0);
  });
}

main().catch(console.error);
