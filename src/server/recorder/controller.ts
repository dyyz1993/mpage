import type { Page, BrowserContext } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { getRecorderScript } from './inject.js';
import type { RecordingSession, RecordedEvent, RecorderStatus } from './types.js';

const activeRecorders: Map<string, { events: RecordedEvent[]; controller: RecorderController }> =
  new Map();
const exposedContexts: WeakSet<BrowserContext> = new WeakSet();

export class RecorderController {
  private page: Page;
  private context: BrowserContext;
  private isRecordingFlag: boolean = false;
  private events: RecordedEvent[] = [];
  private recordingId: string;
  private startTime: number = 0;
  private startUrl: string = '';
  private name: string = '';
  private navigationHandler: (() => Promise<void>) | null = null;

  constructor(page: Page) {
    this.page = page;
    this.context = page.context();
    this.recordingId = this.generateId();
  }

  async start(options: { url?: string; name?: string }): Promise<void> {
    if (this.isRecordingFlag) {
      throw new Error('Recording is already in progress');
    }

    this.isRecordingFlag = true;
    this.startTime = Date.now();
    this.events = [];
    this.name = options.name || '';
    this.recordingId = this.generateId();

    activeRecorders.set(this.recordingId, { events: this.events, controller: this });

    // Expose function on context FIRST
    if (!exposedContexts.has(this.context)) {
      await this.context.exposeFunction(
        '__mpage_record_event__',
        (event: RecordedEvent & { recordingId?: string }) => {
          if (event.recordingId) {
            const recorder = activeRecorders.get(event.recordingId);
            if (recorder) {
              recorder.events.push(event);
            }
          }
        }
      );
      exposedContexts.add(this.context);
    }

    // Set up navigation handler to inject script on new pages
    this.navigationHandler = async () => {
      if (!this.isRecordingFlag) return;
      try {
        await this.injectRecorderScript();
        await this.page.evaluate((recordingId) => {
          if (!(window as any).__pageRecorder) {
            return;
          }
          if (!(window as any).__pageRecorder.isRecording) {
            (window as any).__pageRecorder.start(recordingId);
          }
        }, this.recordingId);
      } catch {
        // Ignore errors
      }
    };

    this.page.on('framenavigated', this.navigationHandler);

    if (options.url) {
      await this.page.goto(options.url);
      this.startUrl = options.url;
    } else {
      this.startUrl = this.page.url();
    }

    // Inject recorder script AFTER navigation (when page is loaded)
    await this.injectRecorderScript();

    // Start recording on current page
    await this.page.evaluate((recordingId) => {
      (window as any).__pageRecorder?.start(recordingId);
    }, this.recordingId);
  }

  private async injectRecorderScript(): Promise<void> {
    const script = getRecorderScript();
    await this.page.evaluate((scriptContent) => {
      const scriptEl = document.createElement('script');
      scriptEl.id = '__mpage_recorder__';
      scriptEl.textContent = scriptContent;
      (document.head || document.documentElement).appendChild(scriptEl);
    }, script);
  }

  async stop(outputPath?: string): Promise<{ path: string; session: RecordingSession }> {
    if (!this.isRecordingFlag) {
      throw new Error('No recording in progress');
    }

    this.isRecordingFlag = false;

    activeRecorders.delete(this.recordingId);

    try {
      await this.page.evaluate(() => {
        (window as any).__pageRecorder?.stop();
      });
    } catch {
      // Ignore errors if page is already closed
    }

    if (this.navigationHandler) {
      this.page.off('framenavigated', this.navigationHandler);
      this.navigationHandler = null;
    }

    const session: RecordingSession = {
      id: this.recordingId,
      name: this.name,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      startUrl: this.startUrl,
      viewport: this.page.viewportSize() || { width: 1280, height: 720 },
      events: this.events,
      metadata: {
        browser: 'Chromium',
        os: process.platform,
        userAgent: await this.page.evaluate(() => navigator.userAgent).catch(() => 'unknown'),
        recordedAt: new Date().toISOString(),
      },
    };

    const finalPath = outputPath || this.getDefaultOutputPath();

    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const yamlContent = yaml.stringify(session);
    fs.writeFileSync(finalPath, yamlContent, 'utf-8');

    return { path: finalPath, session };
  }

  getStatus(): RecorderStatus | null {
    if (!this.isRecordingFlag) return null;

    return {
      isRecording: true,
      eventCount: this.events.length,
      duration: Date.now() - this.startTime,
    };
  }

  private getDefaultOutputPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    const recordingsDir = path.join(homeDir, '.mpage', 'recordings');

    const date = new Date(this.startTime);
    const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `rec_${dateStr}.yaml`;

    return path.join(recordingsDir, filename);
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
