import type { Page, BrowserContext, Frame, CDPSession } from 'playwright-core';
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
  private browserCDPSession: CDPSession | null = null;
  private cdpClient: CDPSession | null = null; // CDP client for navigation monitoring

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

    await this.ensureContextValid();

    // 2. Add init script with the recorder
    // Pass the recordingId so it can auto-start on every page
    const initScript = getRecorderScript();
    await this.context.addInitScript(initScript);

    // 3. Navigate to URL
    if (options.url) {
      await this.page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

    // 5. Setup CDP-level navigation listener to detect user-initiated navigations
    // This distinguishes between user input (CDP) and JS-triggered navigations
    console.log('[Recorder] Setting up CDP navigation listener...');
    try {
      const client = await this.page.context().newCDPSession(this.page);
      console.log('[Recorder] CDP session created for navigation monitoring');

      // Enable Page domain to receive navigation events
      await client.send('Page.enable');

      // Listen for frame navigated events from CDP (user-initiated)
      client.on('Page.frameNavigated', async (params: any) => {
        if (!this.isRecordingFlag) return;

        const frame = params.frame;
        // Only handle main frame navigations
        if (!frame?.parentId) {
          const currentUrl = frame?.url || this.page.url();
          console.log('[Recorder] CDP Navigation detected:', currentUrl);

          // Record navigation event with CDP source (user-initiated)
          const navEvent: RecordedEvent = {
            id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
            type: 'navigation',
            timestamp: Date.now() - this.startTime,
            data: {
              url: currentUrl,
              navigationType: 'cdp',
              source: 'cdp', // CDP = user input in address bar or link click
            },
            pageState: {
              url: currentUrl,
              title: await this.page.title().catch(() => ''),
              readyState: 'loading',
            },
          };
          this.events.push(navEvent);
          console.log('[Recorder] CDP Navigation event recorded:', currentUrl);
        }
      });

      // Store client for cleanup
      this.cdpClient = client;
    } catch (e) {
      console.log('[Recorder] Failed to setup CDP navigation listener:', e);
    }

    // 6. Setup Playwright navigation handler as backup for JS-triggered navigations
    // This will be marked as 'js' source
    this.navigationHandler = async (frame: Frame) => {
      // Only handle main frame navigations
      if (frame !== this.page.mainFrame()) {
        return;
      }

      if (this.isRecordingFlag) {
        try {
          const currentUrl = frame.url();

          // Check if we already recorded this navigation from CDP
          const lastNav = this.events.filter((e) => e.type === 'navigation').pop();
          if (
            lastNav &&
            lastNav.data?.url === currentUrl &&
            Date.now() - this.startTime - lastNav.timestamp < 1000
          ) {
            console.log('[Recorder] Skipping duplicate navigation event:', currentUrl);
            return;
          }

          // Record navigation event with JS source (program-triggered)
          const navEvent: RecordedEvent = {
            id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
            type: 'navigation',
            timestamp: Date.now() - this.startTime,
            data: {
              url: currentUrl,
              navigationType: 'js',
              source: 'js', // JS = program-triggered (history API, location.href, etc.)
            },
            pageState: {
              url: currentUrl,
              title: await frame.title().catch(() => ''),
              readyState: 'loading',
            },
          };
          this.events.push(navEvent);
          console.log('[Recorder] JS Navigation event recorded:', currentUrl);

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

    // 7. Setup browser-level CDP listener for new tabs (more reliable in CDP mode)
    console.log('[Recorder] Setting up browser-level CDP listener...');
    try {
      const browser = this.page.context().browser();
      console.log('[Recorder] Browser object:', browser ? 'exists' : 'null');

      if (browser) {
        console.log('[Recorder] Creating new browser CDP session...');
        this.browserCDPSession = await browser.newBrowserCDPSession();
        console.log(
          '[Recorder] Browser CDP session created:',
          this.browserCDPSession ? 'success' : 'failed'
        );

        // Enable target discovery
        await this.browserCDPSession.send('Target.setDiscoverTargets', { discover: true });
        console.log('[Recorder] Target discovery enabled');

        // Listen for new targets
        this.browserCDPSession.on('Target.targetCreated', async (params: any) => {
          if (!this.isRecordingFlag) return;

          const { targetInfo } = params;
          console.log('[Recorder] CDP: Target created:', targetInfo?.type, targetInfo?.url);

          // Check if it's a new page with an opener (opened from another page)
          if (targetInfo?.type === 'page' && targetInfo?.openerId) {
            console.log('[Recorder] CDP: New tab detected:', targetInfo.url);

            // Find the page object for this target
            const allPages = browser.contexts().flatMap((ctx) => ctx.pages());
            const newPage = allPages.find((p) => {
              try {
                return p.url() === targetInfo.url || p.url().includes(targetInfo.url);
              } catch {
                return false;
              }
            });

            if (newPage && !this.trackedPages.has(newPage)) {
              console.log('[Recorder] CDP: Found new page, injecting script...');
              this.trackedPages.add(newPage);

              // Inject recorder script
              try {
                await newPage.waitForLoadState('domcontentloaded', { timeout: 5000 });
                await newPage.addScriptTag({ content: getRecorderScript() });
                await newPage.addScriptTag({
                  content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
                });
                console.log('[Recorder] CDP: Script injected successfully');
              } catch (e) {
                console.log('[Recorder] CDP: Failed to inject script:', e);
              }

              // Record tab_open event
              const tabOpenEvent: RecordedEvent = {
                id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
                type: 'tab_open',
                timestamp: Date.now() - this.startTime,
                data: {
                  url: targetInfo.url,
                  openerUrl: this.page.url(),
                },
                pageState: {
                  url: targetInfo.url,
                  title: targetInfo.title || '',
                  readyState: 'complete',
                },
              };
              this.events.push(tabOpenEvent);
              console.log('[Recorder] CDP: Tab opened:', targetInfo.url);
            }
          }
        });

        console.log('[Recorder] Browser-level CDP session created');
      }
    } catch (e) {
      console.log('[Recorder] Failed to create browser CDP session:', e);
    }

    // 8. Poll for new pages (backup method for CDP mode)
    const pollInterval = setInterval(async () => {
      if (!this.isRecordingFlag) {
        clearInterval(pollInterval);
        return;
      }

      try {
        // Get all pages from all contexts (important for CDP mode)
        const browser = this.page.context().browser();
        const allPages: Page[] = [];
        if (browser) {
          for (const ctx of browser.contexts()) {
            allPages.push(...ctx.pages());
          }
        } else {
          allPages.push(...this.context.pages());
        }

        // Check for new pages
        for (const newPage of allPages) {
          if (!this.trackedPages.has(newPage)) {
            const pageUrl = newPage.url();
            console.log('[Recorder] New page detected:', pageUrl);

            // Track this page (including about:blank)
            this.trackedPages.add(newPage);

            // Skip blank pages but track them for later URL changes
            if (pageUrl === 'about:blank' || !pageUrl) {
              console.log('[Recorder] Tracking blank page, waiting for navigation...');

              // Wait for the page to navigate to a real URL
              try {
                await newPage.waitForURL(/^(?!about:blank).*/, { timeout: 10000 });
                const realUrl = newPage.url();
                console.log('[Recorder] Page navigated to:', realUrl);

                // Now inject script and record event
                await this.injectScriptToPage(newPage, realUrl);
              } catch (e) {
                console.log('[Recorder] Blank page did not navigate:', e);
              }
            } else {
              // Non-blank page, inject immediately
              await this.injectScriptToPage(newPage, pageUrl);
            }
          }
        }
      } catch (e) {
        console.log('[Recorder] Poll error:', e);
      }
    }, 500); // Check every 500ms for faster detection

    // Store interval ID for cleanup
    (this as any).pollIntervalId = pollInterval;
  }

  private async injectScriptToPage(newPage: Page, pageUrl: string): Promise<void> {
    // Start recording on the new page
    try {
      // Wait for page to be ready with shorter timeout
      await newPage.waitForLoadState('domcontentloaded', { timeout: 5000 });

      // Inject full recorder script for new pages
      await newPage.addScriptTag({
        content: getRecorderScript(),
      });

      // Start recording on the new page
      await newPage.addScriptTag({
        content: `if (window.__pageRecorder) { window.__pageRecorder.start('${this.recordingId}'); }`,
      });

      console.log('[Recorder] Script injected successfully');
    } catch (e) {
      console.log('[Recorder] Failed to inject script:', e);
    }

    // Record tab_open event
    const tabOpenEvent: RecordedEvent = {
      id: `evt_${String(this.events.length + 1).padStart(3, '0')}`,
      type: 'tab_open',
      timestamp: Date.now() - this.startTime,
      data: {
        url: pageUrl,
        openerUrl: this.page.url(),
      },
      pageState: {
        url: pageUrl,
        title: await newPage.title().catch(() => ''),
        readyState: 'complete',
      },
    };
    this.events.push(tabOpenEvent);
    console.log('[Recorder] Tab opened:', pageUrl);
  }

  private async injectRecorderScript(): Promise<void> {
    await this.page.addScriptTag({ content: getRecorderScript() });
  }

  private async ensureContextValid(): Promise<void> {
    try {
      const pages = this.context.pages();
      if (pages.length === 0) {
        this.page = await this.context.newPage();
        console.log('[Recorder] Created new page in existing context');
      } else {
        try {
          await this.page.url();
        } catch {
          this.page = pages[0];
          console.log('[Recorder] Switched to existing page');
        }
      }
    } catch {
      const browser = this.context.browser();
      if (browser) {
        const oldContext = this.context;
        this.context = await browser.newContext();
        this.page = await this.context.newPage();
        initializedContexts.delete(oldContext);
        console.log('[Recorder] Created new context and page');
      }
    }
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

    // Clear poll interval
    if ((this as any).pollIntervalId) {
      clearInterval((this as any).pollIntervalId);
      (this as any).pollIntervalId = null;
    }

    // Close browser CDP session
    if (this.browserCDPSession) {
      try {
        await this.browserCDPSession.send('Target.setDiscoverTargets', { discover: false });
        await this.browserCDPSession.detach();
      } catch {
        // Ignore errors
      }
      this.browserCDPSession = null;
    }

    // Stop recording on all tracked pages
    this.trackedPages.forEach(async (trackedPage) => {
      try {
        await trackedPage.addScriptTag({
          content: `if (window.__pageRecorder) { window.__pageRecorder.stop(); }`,
        });
      } catch {
        // Ignore errors if page is already closed
      }
    });
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
