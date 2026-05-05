import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { RecorderController } from '../../src/server/recorder/controller.js';
import type { Browser } from 'playwright-core';

describe('Navigation Events Recording Tests', { timeout: 120000 }, () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should record navigation event when page navigates to a new URL', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const eventsBeforeNav = recorder.getStatus()?.eventCount || 0;
    console.log(`Events before navigation: ${eventsBeforeNav}`);

    await page.goto('https://example.org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const eventsAfterNav = recorder.getStatus()?.eventCount || 0;
    console.log(`Events after navigation: ${eventsAfterNav}`);

    const result = await recorder.stop('/tmp/test-nav-event.yaml');

    const navigationEvents = result.session.events.filter((e) => e.type === 'navigation');
    const pageLoadEvents = result.session.events.filter((e) => e.type === 'page_load');

    console.log(`Navigation events: ${navigationEvents.length}`);
    console.log(`Page load events: ${pageLoadEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (navigationEvents.length === 0) {
      console.log('❌ MISSING: navigation event was NOT recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: navigation event was recorded');
    }

    expect(navigationEvents.length >= 1).toBeTruthy();

    await context.close();
  });

  it('should record page_load event when page finishes loading', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-page-load.yaml');

    const pageLoadEvents = result.session.events.filter((e) => e.type === 'page_load');

    console.log(`Page load events: ${pageLoadEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (pageLoadEvents.length === 0) {
      console.log('❌ MISSING: page_load event was NOT recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: page_load event was recorded');
    }

    expect(pageLoadEvents.length >= 1).toBeTruthy();

    await context.close();
  });

  it('should record hash_change event when URL hash changes', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.location.hash = 'section1';
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.location.hash = 'section2';
    });
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-hash-change.yaml');

    const hashChangeEvents = result.session.events.filter((e) => e.type === 'hash_change');

    console.log(`Hash change events: ${hashChangeEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (hashChangeEvents.length === 0) {
      console.log('❌ MISSING: hash_change event was NOT recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: hash_change event was recorded');
    }

    expect(hashChangeEvents.length >= 2).toBeTruthy();

    await context.close();
  });

  it('should record navigation event for history.pushState (SPA routing)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      history.pushState({}, '', '/new-route');
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      history.pushState({}, '', '/another-route');
    });
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-push-state.yaml');

    const navigationEvents = result.session.events.filter((e) => e.type === 'navigation');

    console.log(`Navigation events from pushState: ${navigationEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (navigationEvents.length < 2) {
      console.log('❌ MISSING: navigation events from pushState were NOT recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: navigation events from pushState were recorded');
    }

    expect(navigationEvents.length >= 2).toBeTruthy();

    await context.close();
  });

  it('should record navigation event for history.replaceState', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      history.replaceState({}, '', '/replaced-url');
    });
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-replace-state.yaml');

    const navigationEvents = result.session.events.filter((e) => e.type === 'navigation');

    console.log(`Navigation events from replaceState: ${navigationEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (navigationEvents.length === 0) {
      console.log('❌ MISSING: navigation event from replaceState was NOT recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: navigation event from replaceState was recorded');
    }

    expect(navigationEvents.length >= 1).toBeTruthy();

    await context.close();
  });

  it('should record navigation event for popstate (back/forward)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      history.pushState({}, '', '/page1');
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      history.pushState({}, '', '/page2');
    });
    await page.waitForTimeout(300);

    await page.goBack();
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-popstate.yaml');

    const navigationEvents = result.session.events.filter((e) => e.type === 'navigation');

    console.log(`Navigation events including popstate: ${navigationEvents.length}`);
    console.log('All event types:', [...new Set(result.session.events.map((e) => e.type))]);

    if (navigationEvents.length < 3) {
      console.log('❌ MISSING: navigation events for popstate were NOT fully recorded');
      console.log('   This test will fail to highlight the missing feature');
    } else {
      console.log('✅ PASS: navigation events for popstate were recorded');
    }

    expect(navigationEvents.length >= 3).toBeTruthy();

    await context.close();
  });

  it('should capture navigation event data including URL and navigationType', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.goto('https://example.org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const result = await recorder.stop('/tmp/test-nav-data.yaml');

    const navigationEvents = result.session.events.filter((e) => e.type === 'navigation');

    if (navigationEvents.length > 0) {
      const navEvent = navigationEvents[0];
      console.log('Navigation event data:', JSON.stringify(navEvent.data, null, 2));

      expect(navEvent.data?.url).toBeTruthy();

      console.log(`✅ Navigation event has URL: ${navEvent.data.url}`);
    } else {
      console.log('❌ No navigation events to check data structure');
      expect.unreachable('No navigation events recorded to verify data structure');
    }

    await context.close();
  });
});
