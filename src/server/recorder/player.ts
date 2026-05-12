import type { Page, CDPSession } from 'playwright-core';
import * as fs from 'fs';
import * as yaml from 'yaml';
import type {
  RecordingSession,
  RecordedEvent,
  PlaybackOptions,
  PlaybackResult,
  PlaybackError,
} from './types.js';
import { executeEvent } from './player-actions.js';
import { executeWaits } from './player-wait.js';
import { executeAssertions } from './player-assert.js';

export class PlaybackEngine {
  private page: Page;
  private recording: RecordingSession;
  private cdpSession: CDPSession | null = null;

  constructor(page: Page, recording: RecordingSession) {
    this.page = page;
    this.recording = recording;
  }

  // eslint-disable-next-line require-await
  static async fromFile(page: Page, filePath: string): Promise<PlaybackEngine> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const recording = yaml.parse(content) as RecordingSession;
    return new PlaybackEngine(page, recording);
  }

  private async ensureCDPSession(): Promise<CDPSession> {
    if (!this.cdpSession) {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
    }
    return this.cdpSession;
  }

  async play(options: PlaybackOptions = {}): Promise<PlaybackResult> {
    const startTime = Date.now();
    const errors: PlaybackError[] = [];
    const { slowMo = 1, noDelay = false, stopOnError = true, onProgress } = options;

    const currentUrl = this.page.url();
    if (currentUrl !== this.recording.startUrl) {
      try {
        await this.page.goto(this.recording.startUrl, {
          timeout: 30000,
          waitUntil: 'domcontentloaded',
        });
      } catch (e) {
        console.log(
          `[Playback] Failed to goto ${this.recording.startUrl}, continuing with current page...`
        );
      }
    }

    if (this.recording.viewport) {
      await this.page.setViewportSize(this.recording.viewport);
    }

    const events = this.aggregateMouseMoveEvents(this.recording.events || []);
    const ctx = { page: this.page, getCdpSession: () => this.ensureCDPSession() };

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        if (i > 0 && !noDelay) {
          const prevEvent = events[i - 1];
          const delay = event.timestamp - prevEvent.timestamp;
          if (delay > 0) {
            await this.page.waitForTimeout(delay * slowMo);
          }
        }

        if (event.waitBefore && event.waitBefore.length > 0) {
          await executeWaits(this.page, event.waitBefore);
        }

        await executeEvent(ctx, event);

        if (event.assertAfter && event.assertAfter.length > 0) {
          await executeAssertions(this.page, event.assertAfter);
        }

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: events.length,
            event,
          });
        }
      } catch (error) {
        errors.push({
          eventIndex: i,
          event,
          error: (error as Error).message,
        });

        if (stopOnError) {
          break;
        }
      }
    }

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      eventsPlayed: events.length - errors.length,
      totalEvents: events.length,
      errors,
    };
  }

  private aggregateMouseMoveEvents(events: RecordedEvent[]): RecordedEvent[] {
    const result: RecordedEvent[] = [];
    let i = 0;

    console.log(`[Playback] Aggregating mousemove events, total events: ${events.length}`);

    while (i < events.length) {
      const event = events[i];

      if (event.type === 'mousemove') {
        const trajectoryPoints: Array<{ x: number; y: number; delay: number }> = [];
        const startTime = event.timestamp;

        while (i < events.length && events[i].type === 'mousemove') {
          const currentEvent = events[i];
          const data = currentEvent.data || {};

          if (data.x !== undefined && data.y !== undefined) {
            trajectoryPoints.push({
              x: data.x,
              y: data.y,
              delay: i > 0 ? currentEvent.timestamp - events[i - 1].timestamp : 0,
            });
          }
          i++;
        }

        console.log(`[Playback] Found ${trajectoryPoints.length} consecutive mousemove events`);

        if (trajectoryPoints.length > 1) {
          result.push({
            id: `trajectory_${startTime}`,
            type: 'mousemove',
            timestamp: startTime,
            data: {
              points: trajectoryPoints,
              isTrajectory: true,
            },
            pageState: event.pageState,
          });
          console.log(`[Playback] Created trajectory event with ${trajectoryPoints.length} points`);
        } else if (trajectoryPoints.length === 1) {
          result.push(event);
        }
      } else {
        result.push(event);
        i++;
      }
    }

    console.log(`[Playback] Aggregated events: ${result.length} (reduced from ${events.length})`);
    return result;
  }
}
