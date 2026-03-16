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
  private pageHandler: ((page: Page) => Promise<void>) | null = null;
  private trackedPages: Set<Page> = new Set();

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

    // 4.1 Record initial page_load event for the starting page
    const initialUrl = this.page.url();
    const initialPageLoadEvent: RecordedEvent = {
      id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
      type: 'page_load',
      timestamp: Date.now() - this.startTime,
      data: {
        url: initialUrl,
        persisted: false,
      },
      pageState: {
        url: initialUrl,
        title: await this.page.title().catch(() => ''),
        readyState: 'complete',
      },
    };
    this.events.push(initialPageLoadEvent);
    console.log('[Recorder] Initial page load event recorded:', initialUrl);

    // 5. Setup navigation listener to auto-restart recording on new pages
    // Use 'framenavigated' instead of 'load' as it's more reliable for detecting navigation
    this.navigationHandler = async (frame: Frame) => {
      // Only handle main frame navigations
      if (frame !== this.page.mainFrame()) {
        return;
      }

      if (this.isRecordingFlag) {
        try {
          // Record navigation event for browser-level navigations
          const currentUrl = frame.url();
          const navEvent: RecordedEvent = {
            id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
            type: 'navigation',
            timestamp: Date.now() - this.startTime,
            data: {
              url: currentUrl,
              navigationType: 'link',
            },
            pageState: {
              url: currentUrl,
              title: await frame.title().catch(() => ''),
              readyState: 'loading',
            },
          };
          this.events.push(navEvent);
          console.log('[Recorder] Navigation event recorded:', currentUrl);

          // Wait for the page to be fully ready
          await this.page.waitForLoadState('domcontentloaded');

          // Always call start() on new pages to show indicator and ensure recording
          await this.page.addScriptTag({
            content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
          });

          // Record page_load event after page is ready
          const pageLoadEvent: RecordedEvent = {
            id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
            type: 'page_load',
            timestamp: Date.now() - this.startTime,
            data: {
              url: currentUrl,
              persisted: false,
            },
            pageState: {
              url: currentUrl,
              title: await frame.title().catch(() => ''),
              readyState: 'complete',
            },
          };
          this.events.push(pageLoadEvent);
          console.log('[Recorder] Page load event recorded:', currentUrl);
        } catch {
          // Ignore errors if page is not ready
        }
      }
    };

    this.page.on('framenavigated', this.navigationHandler);

    // 6. Setup context 'page' listener to handle new tabs
    this.pageHandler = async (newPage: Page) => {
      if (!this.isRecordingFlag) return;

      // Track this page for cleanup
      this.trackedPages.add(newPage);

      try {
        // Wait for the new page to be ready
        await newPage.waitForLoadState('domcontentloaded');

        // Start recording on the new page
        await newPage.addScriptTag({
          content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
        });

        // Record tab_open event
        const tabOpenEvent: RecordedEvent = {
          id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
          type: 'tab_open',
          timestamp: Date.now() - this.startTime,
          data: {
            url: newPage.url(),
            openerUrl: this.page.url(),
          },
          pageState: {
            url: newPage.url(),
            title: await newPage.title().catch(() => ''),
            readyState: 'complete',
          },
        };
        this.events.push(tabOpenEvent);
        console.log('[Recorder] Tab opened:', newPage.url());
      } catch {
        // Ignore errors if page is not ready
      }
    };

    this.context.on('page', this.pageHandler);
    this.trackedPages.add(this.page);
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

    // Remove page listener
    if (this.pageHandler) {
      this.context.off('page', this.pageHandler);
      this.pageHandler = null;
    }

    // Stop recording on all tracked pages
    for (const trackedPage of this.trackedPages) {
      try {
        await trackedPage.addScriptTag({
          content: `if (window.__pageRecorder) { window.__pageRecorder.stop(); }`,
        });
      } catch {
        // Ignore errors if page is already closed
      }
    }
    this.trackedPages.clear();

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
