import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { SessionInfo } from "../types.js";

export const DEFAULT_STORAGE = path.join(os.tmpdir(), "mpage");

export function ensureStorage(): void {
  if (!fs.existsSync(DEFAULT_STORAGE)) {
    fs.mkdirSync(DEFAULT_STORAGE, { recursive: true });
  }
}

export function getSessionPath(name: string): string {
  return path.join(DEFAULT_STORAGE, "sessions", name);
}

export function getSessionFile(name: string): string {
  return path.join(getSessionPath(name), "session.json");
}

export function loadSessionInfo(name: string): SessionInfo | null {
  const file = getSessionFile(name);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  }
  return null;
}

export function saveSessionInfo(info: SessionInfo): void {
  const sessionPath = getSessionPath(info.name);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(sessionPath, "session.json"),
    JSON.stringify(info, null, 2),
    "utf-8"
  );
}

export function deleteSessionInfo(name: string): void {
  const sessionPath = getSessionPath(name);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
}

export function listSessions(): SessionInfo[] {
  const sessionsPath = path.join(DEFAULT_STORAGE, "sessions");
  if (!fs.existsSync(sessionsPath)) return [];
  
  return fs.readdirSync(sessionsPath)
    .map(name => loadSessionInfo(name))
    .filter((s): s is SessionInfo => s !== null);
}

export function getSocketPath(name: string): string {
  return path.join(getSessionPath(name), "socket");
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
