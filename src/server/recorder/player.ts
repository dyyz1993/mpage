import type { Page } from 'playwright-core';
import * as fs from 'fs';
import * as yaml from 'yaml';
import type {
  RecordingSession,
  RecordedEvent,
  WaitCondition,
  AssertCondition,
  PlaybackOptions,
  PlaybackResult,
  PlaybackError,
} from './types.js';

export class PlaybackEngine {
  private page: Page;
  private recording: RecordingSession;

  constructor(page: Page, recording: RecordingSession) {
    this.page = page;
    this.recording = recording;
  }

  static async fromFile(page: Page, filePath: string): Promise<PlaybackEngine> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const recording = yaml.parse(content) as RecordingSession;
    return new PlaybackEngine(page, recording);
  }

  async play(options: PlaybackOptions = {}): Promise<PlaybackResult> {
    const startTime = Date.now();
    const errors: PlaybackError[] = [];
    const { slowMo = 1, noDelay = false, stopOnError = true, onProgress } = options;

    await this.page.goto(this.recording.startUrl);

    if (this.recording.viewport) {
      await this.page.setViewportSize(this.recording.viewport);
    }

    const events = this.recording.events || [];

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
          await this.executeWaits(event.waitBefore);
        }

        await this.executeEvent(event);

        if (event.assertAfter && event.assertAfter.length > 0) {
          await this.executeAssertions(event.assertAfter);
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

  private async executeWaits(conditions: WaitCondition[]): Promise<void> {
    for (const condition of conditions) {
      await this.executeWait(condition);
    }
  }

  private async executeWait(condition: WaitCondition): Promise<void> {
    const timeout = condition.timeout || 30000;

    switch (condition.type) {
      case 'element_visible':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'visible', timeout });
        }
        break;

      case 'element_hidden':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'hidden', timeout });
        }
        break;

      case 'element_attached':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'attached', timeout });
        }
        break;

      case 'element_detached':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'detached', timeout });
        }
        break;

      case 'page_load':
        await this.page.waitForLoadState('domcontentloaded');
        break;

      case 'network_idle':
        await this.page.waitForLoadState('networkidle', { timeout });
        break;

      case 'url_match':
        if (condition.url) {
          await this.page.waitForURL(condition.url, { timeout });
        }
        break;

      case 'text_present':
        if (condition.text) {
          await this.page.waitForSelector(`text=${condition.text}`, { timeout });
        }
        break;

      case 'timeout':
        if (condition.timeout) {
          await this.page.waitForTimeout(condition.timeout);
        }
        break;
    }
  }

  private async executeAssertions(conditions: AssertCondition[]): Promise<void> {
    for (const condition of conditions) {
      await this.executeAssertion(condition);
    }
  }

  private async executeAssertion(condition: AssertCondition): Promise<void> {
    switch (condition.type) {
      case 'element_exists':
        if (condition.selector) {
          const element = await this.page.$(condition.selector);
          if (!element) {
            throw new Error(`Assertion failed: Element not found - ${condition.selector}`);
          }
        }
        break;

      case 'element_visible':
        if (condition.selector) {
          const visible = await this.page.isVisible(condition.selector);
          if (!visible) {
            throw new Error(`Assertion failed: Element not visible - ${condition.selector}`);
          }
        }
        break;

      case 'element_hidden':
        if (condition.selector) {
          const hidden = await this.page.isHidden(condition.selector);
          if (!hidden) {
            throw new Error(`Assertion failed: Element is visible - ${condition.selector}`);
          }
        }
        break;

      case 'text_equals':
        if (condition.selector && condition.expected !== undefined) {
          const text = await this.page.textContent(condition.selector);
          if (text !== condition.expected) {
            throw new Error(
              `Assertion failed: Text mismatch. Expected "${condition.expected}", got "${text}"`
            );
          }
        }
        break;

      case 'text_contains':
        if (condition.selector && condition.expected !== undefined) {
          const text = await this.page.textContent(condition.selector);
          if (!text?.includes(String(condition.expected))) {
            throw new Error(
              `Assertion failed: Text does not contain "${condition.expected}". Got "${text}"`
            );
          }
        }
        break;

      case 'url_equals':
        if (condition.expected !== undefined) {
          const url = this.page.url();
          if (url !== condition.expected) {
            throw new Error(
              `Assertion failed: URL mismatch. Expected "${condition.expected}", got "${url}"`
            );
          }
        }
        break;

      case 'url_contains':
        if (condition.expected !== undefined) {
          const url = this.page.url();
          if (!url.includes(String(condition.expected))) {
            throw new Error(
              `Assertion failed: URL does not contain "${condition.expected}". Got "${url}"`
            );
          }
        }
        break;
    }
  }

  private async executeEvent(event: RecordedEvent): Promise<void> {
    const data = event.data || {};

    switch (event.type) {
      case 'click':
        if (event.selector) {
          await this.page.click(event.selector);
        }
        break;

      case 'dblclick':
        if (event.selector) {
          await this.page.dblclick(event.selector);
        }
        break;

      case 'contextmenu':
        if (event.selector) {
          await this.page.click(event.selector, { button: 'right' });
        }
        break;

      case 'mousedown':
        if (event.selector) {
          await this.page.hover(event.selector);
        }
        break;

      case 'mouseup':
        // Usually paired with mousedown, no action needed
        break;

      case 'mousemove':
        if (data.x !== undefined && data.y !== undefined) {
          await this.page.mouse.move(data.x, data.y);
        }
        break;

      case 'hover_enter':
        if (event.selector) {
          await this.page.hover(event.selector);
        }
        break;

      case 'hover_leave':
        // Move mouse away from element
        await this.page.mouse.move(0, 0);
        break;

      case 'scroll':
        await this.page.evaluate((scrollData) => {
          window.scrollTo(scrollData.scrollX || 0, scrollData.scrollY || 0);
        }, data);
        break;

      case 'keydown':
        if (data.key) {
          const modifiers: string[] = [];
          if (data.ctrlKey) modifiers.push('Control');
          if (data.shiftKey) modifiers.push('Shift');
          if (data.altKey) modifiers.push('Alt');
          if (data.metaKey) modifiers.push('Meta');

          if (modifiers.length > 0) {
            for (const mod of modifiers) {
              await this.page.keyboard.down(mod);
            }
          }

          await this.page.keyboard.press(data.key);

          if (modifiers.length > 0) {
            for (const mod of modifiers.reverse()) {
              await this.page.keyboard.up(mod);
            }
          }
        }
        break;

      case 'keyup':
        // Usually handled by keydown
        break;

      case 'input':
        if (event.selector && data.value !== undefined) {
          await this.page.fill(event.selector, data.value);
        }
        break;

      case 'change':
        if (event.selector) {
          if (data.checked !== undefined) {
            if (data.checked) {
              await this.page.check(event.selector);
            } else {
              await this.page.uncheck(event.selector);
            }
          } else if (data.value !== undefined) {
            await this.page.selectOption(event.selector, data.value);
          }
        }
        break;

      case 'focus':
        if (event.selector) {
          await this.page.focus(event.selector);
        }
        break;

      case 'blur':
        // Blur by focusing on body
        await this.page.focus('body');
        break;

      case 'select':
        if (event.selector && data.value !== undefined) {
          await this.page.selectOption(event.selector, data.value);
        }
        break;

      case 'navigation':
        if (data.url) {
          await this.page.goto(data.url);
        }
        break;

      case 'page_load':
        await this.page.waitForLoadState('domcontentloaded');
        break;

      case 'hash_change':
        if (data.url) {
          await this.page.goto(data.url);
        }
        break;

      case 'file_upload':
        if (event.selector && data.files) {
          await this.page.setInputFiles(event.selector, data.files);
        }
        break;

      case 'wait':
        // Wait event is handled by waitBefore
        break;

      case 'assert':
        // Assert event is handled by assertAfter
        break;
    }
  }
}
