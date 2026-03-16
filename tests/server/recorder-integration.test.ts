import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright-core';
import { RecorderController } from '../../src/server/recorder/controller.js';
import type { Browser } from 'playwright-core';

describe('Recorder Integration Tests', { timeout: 60000, skip: true }, () => {
  let browser: Browser;

  before(async () => {
    browser = await chromium.launch({
      headless: false,
      executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    });
  });

  after(async () => {
    await browser.close();
  });

  it('should record click events', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Click on the body using page.mouse.click
    await page.mouse.click(100, 200);

    // Wait a bit for event to be recorded
    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    assert.ok(status, 'Status should be available');
    assert.ok(status!.isRecording, 'Should be recording');
    assert.ok(status!.eventCount >= 1, 'Should have recorded at least 1 event');

    console.log('Recorded events:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording.yaml');

    assert.ok(result.session.events.length >= 1, 'Should have at least 1 event');
    console.log('Session:', result.session);

    await context.close();
  });

  it('should record keyboard events', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');

    // Press keys
    await page.keyboard.press('Enter');
    await page.keyboard.press('a');
    await page.keyboard.press('b');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    assert.ok(status, 'Status should be available');
    assert.ok(status!.eventCount >= 1, 'Should have recorded keyboard events');

    const result = await recorder.stop('/tmp/test-recording-kb.yaml');
    assert.ok(result.session.events.length >= 1, 'Should have at least 1 keyboard event');
    console.log('Keyboard events:', result.session.events);

    await context.close();
  });

  it('should handle page navigation', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');

    // Click on the first page
    await page.mouse.click(100, 200);

    await page.waitForTimeout(500);

    // Navigate to a new page
    await page.goto('https://example.org');

    await page.waitForLoadState('networkidle');

    // Click on the new page
    await page.mouse.click(100, 200);

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    assert.ok(status, 'Status should be available');
    assert.ok(status!.eventCount >= 2, 'Should have recorded events on both pages');

    const result = await recorder.stop('/tmp/test-recording-nav.yaml');
    assert.ok(result.session.events.length >= 2, 'Should have events from both pages');
    console.log('Events:', result.session.events);

    await context.close();
  });
});
