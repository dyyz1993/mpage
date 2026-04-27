import { tmpdir } from 'os';
import { join } from 'path';

export const DEFAULT_CHROMIUM_PATH =
  process.env.MPAGE_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';

export const DEFAULT_STORAGE = join(process.env.MPAGE_STORAGE_DIR || tmpdir(), 'mpage');
