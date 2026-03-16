import type { Page, BrowserContext, Frame } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { getRecorderScript } from './inject.js';
import type { RecordingSession, RecordedEvent, RecorderStatus } from './types.js';

const activeRecorders: Map<string, { events: RecordedEvent[]; controller: RecorderController }> =
  new Map();
const initializedContexts: WeakSet<BrowserContext> = new WeakSet();

export class RecorderController {
  private page: Page;
  private context: BrowserContext;
  private isRecordingFlag: boolean = false;
  private events: RecordedEvent[] = [];
  private recordingId: string;
  private startTime: number = 0;
  private startUrl: string = '';
  private name: string = '';
  private navigationHandler: ((frame: Frame) => Promise<void>) | null = null;

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

    // 1. Setup route to intercept event communication
    // This is more reliable than exposeFunction for cross-world communication
    // The browser will POST events to /__mpage_record_event__
    if (!initializedContexts.has(this.context)) {
      await this.context.route('**/__mpage_record_event__', async (route) => {
        const request = route.request();
        const body = request.postData();

        if (body) {
          try {
            const event = JSON.parse(body) as RecordedEvent & { recordingId?: string };
            console.log('[Recorder] Event received:', event.type);
            if (event.recordingId) {
              const recorder = activeRecorders.get(event.recordingId);
              if (recorder) {
                recorder.events.push(event);
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      initializedContexts.add(this.context);
    }

    // 2. Add init script with the recorder
    // Pass the recordingId so it can auto-start on every page
    const initScript = getRecorderScript();
    await this.context.addInitScript(initScript);

    // 3. Navigate to URL
    if (options.url) {
      await this.page.goto(options.url);
      this.startUrl = options.url;
    } else {
      this.startUrl = this.page.url();
      await this.injectRecorderScript();
    }

    // 4. Start recording on current page
    await this.page.addScriptTag({
      content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
    });

    // 5. Setup navigation listener to auto-restart recording on new pages
    // Use 'framenavigated' instead of 'load' as it's more reliable for detecting navigation
    this.navigationHandler = async (frame: Frame) => {
      // Only handle main frame navigations
      if (frame !== this.page.mainFrame()) {
        return;
      }

      if (this.isRecordingFlag) {
        try {
          // Wait for the page to be fully ready
          await this.page.waitForLoadState('domcontentloaded');

          // Always call start() on new pages to show indicator and ensure recording
          await this.page.addScriptTag({
            content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
          });
        } catch {
          // Ignore errors if page is not ready
        }
      }
    };

    this.page.on('framenavigated', this.navigationHandler);
  }

  private async injectRecorderScript(): Promise<void> {
    await this.page.addScriptTag({ content: getRecorderScript() });
  }

  async stop(outputPath?: string): Promise<{ path: string; session: RecordingSession }> {
    if (!this.isRecordingFlag) {
      throw new Error('No recording in progress');
    }

    this.isRecordingFlag = false;

    // Remove navigation listener
    if (this.navigationHandler) {
      this.page.off('framenavigated', this.navigationHandler);
      this.navigationHandler = null;
    }

    activeRecorders.delete(this.recordingId);

    try {
      await this.page.addScriptTag({
        content: `if (window.__pageRecorder) { window.__pageRecorder.stop(); }`,
      });
    } catch {
      // Ignore errors if page is already closed
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
