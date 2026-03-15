#!/usr/bin/env tsx
import * as net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import * as path from "path";
import {
  commands,
  parseArgsToRecord,
  parseCommandChain,
  splitCommand,
  getCommandNames,
  ensureStorage,
  loadSessionInfo,
  deleteSessionInfo,
  listSessions,
  isProcessRunning,
  getSocketPath,
  findSimilarCommands,
  tip
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sendRequest(socketPath: string, data: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify(data) + "\n");
    });
    
    let response = "";
    client.on("data", (chunk) => {
      response += chunk.toString();
      if (response.includes("\n")) {
        client.end();
      }
    });
    
    client.on("end", () => {
      try {
        const lines = response.trim().split("\n");
        resolve(JSON.parse(lines[0]));
      } catch {
        reject(new Error("Invalid response"));
      }
    });
    
    client.on("error", (err) => {
      reject(err);
    });
    
    client.setTimeout(30000, () => {
      client.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function startServer(sessionName: string, cdpEndpoint?: string): Promise<import("../src/types.js").SessionInfo | null> {
  const serverPath = path.join(__dirname, "mpage-server.ts");
  
  const args = [serverPath, sessionName];
  if (cdpEndpoint) args.push(cdpEndpoint);
  
  const serverProcess = spawn("tsx", args, {
    detached: true,
    stdio: "ignore",
  });
  serverProcess.unref();
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const info = loadSessionInfo(sessionName);
    if (info && isProcessRunning(info.serverPid) && path) {
      const socket = getSocketPath(sessionName);
      if (socket) return info;
    }
  }
  
  return null;
}

async function getOrCreateSession(sessionName: string, cdpEndpoint?: string): Promise<{ socketPath: string; info: import("../src/types.js").SessionInfo } | null> {
  let info = loadSessionInfo(sessionName);
  
  if (info && isProcessRunning(info.serverPid)) {
    const socketPath = getSocketPath(sessionName);
    if (socketPath && path) {
      if (cdpEndpoint) {
        if (info.isCDP && info.cdpEndpoint === cdpEndpoint) {
          tip(`Session '${sessionName}' 已连接到此 CDP，无需重复指定 --cdp`);
        } else if (info.isCDP) {
          tip(`Session '${sessionName}' 已连接到其他 CDP (${info.cdpEndpoint})，如需更换请先 close`);
        } else {
          tip(`Session '${sessionName}' 不是 CDP session，如需使用 CDP 请先 close`);
        }
      }
      return { socketPath, info };
    }
  }
  
  if (info) {
    deleteSessionInfo(sessionName);
  }
  
  info = await startServer(sessionName, cdpEndpoint);
  if (!info) {
    console.error("Failed to start session server");
    return null;
  }
  
  const socketPath = getSocketPath(sessionName);
  return socketPath ? { socketPath, info } : null;
}

async function executeCommand(
  socketPath: string,
  cmd: string,
  args: Record<string, unknown>,
  jsonMode: boolean = false
): Promise<{ output: string; error: boolean; tips?: string }> {
  try {
    const response = await sendRequest(socketPath, { command: cmd, args }) as {
      success: boolean;
      content?: unknown;
      error?: string;
      tips?: string;
    };
    
    if (!response.success) {
      return {
        output: response.error || "Unknown error",
        error: true,
        tips: response.tips
      };
    }
    
    const content = response.content;
    const tips = response.tips;
    
    if (jsonMode) {
      return {
        output: JSON.stringify({ success: true, content, tips }, null, 2),
        error: false
      };
    }
    
    let output = "";
    if (content !== undefined && content !== null) {
      if (typeof content === 'string') {
        output = content;
      } else if (typeof content === 'object') {
        const c = content as Record<string, unknown>;
        if (c.url !== undefined) output = String(c.url);
        else if (c.title !== undefined) output = String(c.title);
        else if (c.text !== undefined) output = String(c.text);
        else if (c.html !== undefined) output = String(c.html);
        else if (c.path !== undefined) output = String(c.path);
        else if (c.snapshot !== undefined) {
          output = typeof c.snapshot === 'string'
            ? c.snapshot
            : JSON.stringify(c.snapshot, null, 2);
        }
        else if (c.elements !== undefined) output = JSON.stringify(c.elements, null, 2);
        else if (c.result !== undefined) output = JSON.stringify(c.result, null, 2);
        else output = JSON.stringify(content, null, 2);
      }
    }
    
    return { output, error: false, tips };
  } catch (e: unknown) {
    return { output: (e as Error).message, error: true };
  }
}

async function executePipeline(
  socketPath: string,
  pipeline: string[],
  jsonMode: boolean = false
): Promise<{ output: string; error: boolean; tips?: string }> {
  let currentOutput = "";
  let currentTips = "";
  
  for (const cmdStr of pipeline) {
    const parts = splitCommand(cmdStr);
    const cmd = parts[0];
    const cmdArgs = parts.slice(1);
    
    if (!commands[cmd]) {
      const suggestions = findSimilarCommands(cmd, getCommandNames());
      return {
        output: `Unknown command: ${cmd}`,
        error: true,
        tips: suggestions.length > 0
          ? `你是想输入 '${suggestions[0]}' 吗？相似命令: ${suggestions.join(", ")}`
          : undefined
      };
    }
    
    const schema = commands[cmd].schema;
    const args = parseArgsToRecord(cmdArgs, schema);
    
    try {
      schema.parse(args);
    } catch (e: unknown) {
      return { output: `Invalid args for ${cmd}: ${(e as Error).message}`, error: true };
    }
    
    const result = await executeCommand(socketPath, cmd, args, jsonMode);
    currentOutput = result.output;
    if (result.tips) currentTips = result.tips;
    if (result.error) return { output: currentOutput, error: true, tips: currentTips };
  }
  
  return { output: currentOutput, error: false, tips: currentTips };
}

async function executeCommandChain(
  socketPath: string,
  input: string,
  jsonMode: boolean = false
): Promise<{ output: string; error: boolean; tips?: string }> {
  const parsed = parseCommandChain(input);
  let lastOutput = "", lastError = false, lastTips = "";

  for (const { pipeline, type } of parsed) {
    if (type === "and" && lastError) continue;
    const result = await executePipeline(socketPath, pipeline, jsonMode);
    lastOutput = result.output;
    lastError = result.error;
    if (result.tips) lastTips = result.tips;
  }

  return { output: lastOutput, error: lastError, tips: lastTips };
}

async function main() {
  ensureStorage();
  
  const args = process.argv.slice(2);
  let sessionName = "default";
  let cdpEndpoint = "";
  let commandInput = "";
  let jsonMode = false;
  let quietMode = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" || args[i] === "-s") {
      sessionName = args[++i];
    } else if (args[i] === "--cdp") {
      cdpEndpoint = args[++i];
    } else if (args[i] === "--json" || args[i] === "-j") {
      jsonMode = true;
    } else if (args[i] === "--quiet" || args[i] === "-q") {
      quietMode = true;
    } else if (!args[i].startsWith("-") && !commandInput) {
      commandInput = args[i];
    }
  }
  
  if (commandInput === "kill") {
    const sessions = listSessions();
    for (const s of sessions) {
      if (s.serverPid && isProcessRunning(s.serverPid)) {
        try { process.kill(s.serverPid, "SIGTERM"); } catch {}
      }
      if (s.pid && isProcessRunning(s.pid)) {
        try { process.kill(s.pid, "SIGTERM"); } catch {}
      }
      deleteSessionInfo(s.name);
    }
    console.log(`Killed ${sessions.length} sessions`);
    process.exit(0);
  }
  
  if (commandInput === "session") {
    const action = args[args.indexOf("session") + 1];
    if (action === "list" || action === "ls") {
      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log("No sessions");
      } else {
        for (const s of sessions) {
          const running = isProcessRunning(s.serverPid);
          console.log(`${s.name} ${running ? "(running)" : "(stopped)"} - ${s.isCDP ? "CDP" : "local"}`);
        }
      }
      process.exit(0);
    }
  }
  
  if (commandInput === "close") {
    const info = loadSessionInfo(sessionName);
    if (info) {
      const socketPath = getSocketPath(sessionName);
      if (info.serverPid && isProcessRunning(info.serverPid) && socketPath) {
        try {
          await sendRequest(socketPath, { action: "close" });
        } catch {
          process.kill(info.serverPid, "SIGTERM");
        }
      }
      if (info.pid && isProcessRunning(info.pid)) {
        try { process.kill(info.pid, "SIGTERM"); } catch {}
      }
      deleteSessionInfo(sessionName);
      console.log(`Session '${sessionName}' closed`);
    } else {
      console.log(`Session '${sessionName}' not found`);
    }
    process.exit(0);
  }
  
  if (!commandInput) {
    console.log("Usage: mpage [options] <command>");
    console.log("");
    console.log("Options:");
    console.log("  --session, -s <name>  Session name (default: default)");
    console.log("  --cdp <endpoint>      CDP endpoint to connect");
    console.log("");
    console.log("Commands:");
    console.log("  kill                  Kill all sessions");
    console.log("  close                 Close current session");
    console.log("  session list          List all sessions");
    console.log("");
    console.log("Examples:");
    console.log("  mpage \"goto https://example.com && title\"");
    console.log("  mpage --session test \"goto baidu.com && fill '#kw' 'hello'\"");
    console.log("  mpage --cdp ws://localhost:8080/client \"url\"");
    process.exit(0);
  }
  
  const session = await getOrCreateSession(sessionName, cdpEndpoint);
  if (!session) {
    console.error("Failed to create session");
    process.exit(1);
  }
  
  const result = await executeCommandChain(session.socketPath, commandInput, jsonMode);
  
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
