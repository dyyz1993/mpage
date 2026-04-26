import { join } from 'path';
import { homedir } from 'os';

export const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
export const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');
export const DAEMON_SOCKET_PATH = join(SESSION_DIR, 'daemon.sock');
export const DEFAULT_CHROMIUM_PATH = '/Applications/Chromium.app/Contents/MacOS/Chromium';
