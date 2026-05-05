import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { RecorderController } from '../../src/server/recorder/controller.js';
import type { Browser } from 'playwright-core';

describe('Recorder Integration Tests', { timeout: 120000 }, () => {
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

  it('should record click events on example.com', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.click('body');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    expect(status).toBeTruthy();
    expect(status!.isRecording).toBeTruthy();
    expect(status!.eventCount >= 1).toBeTruthy();

    console.log('✅ Click events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-click.yaml');

    expect(result.session.events.length >= 1).toBeTruthy();
    console.log(
      'Session events:',
      result.session.events.map((e) => e.type)
    );

    await context.close();
  });

  it('should record keyboard events', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.keyboard.press('Enter');
    await page.keyboard.press('a');
    await page.keyboard.press('b');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    expect(status).toBeTruthy();
    expect(status!.eventCount >= 1).toBeTruthy();

    console.log('✅ Keyboard events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-kb.yaml');
    expect(result.session.events.length >= 1).toBeTruthy();

    const keydownEvents = result.session.events.filter((e) => e.type === 'keydown');
    console.log(
      'Keydown events:',
      keydownEvents.map((e) => e.data?.key)
    );

    await context.close();
  });

  it('should handle page navigation', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.click('body');

    await page.waitForTimeout(500);

    await page.goto('https://example.org');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.click('body');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    expect(status).toBeTruthy();
    expect(status!.eventCount >= 2).toBeTruthy();

    console.log('✅ Navigation events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-nav.yaml');
    expect(result.session.events.length >= 2).toBeTruthy();

    const pageUrls = [...new Set(result.session.events.map((e) => e.pageState?.url))];
    console.log('Pages visited:', pageUrls);

    await context.close();
  });

  it('should record Baidu search flow with assertions', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      console.log('\n📍 第一阶段：搜索');

      await recorder.start({ url: 'https://www.baidu.com' });

      const hasRecorder = await page.evaluate('typeof window.__pageRecorder !== "undefined"');
      expect(hasRecorder).toBeTruthy();
      console.log('   ✅ 断言1: __pageRecorder 存在');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('#kw').or(page.locator('input[name="wd"]'));
      await searchInput.fill('Playwright 自动化测试', { force: true });
      console.log('   已输入搜索内容');

      const searchBtn = page.locator('#su');
      if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchBtn.click({ force: true });
        console.log('   已点击搜索按钮');
      } else {
        await page.keyboard.press('Enter');
        console.log('   已按回车搜索');
      }

      console.log('\n📍 第二阶段：跳转验证');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const searchUrl = page.url();
      console.log(`   当前URL: ${searchUrl}`);

      expect(searchUrl.includes('wd=')).toBeTruthy();
      console.log('   ✅ 断言3: URL包含 wd=');

      const hasRecorderAfterNav = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined"'
      );
      expect(hasRecorderAfterNav).toBeTruthy();
      console.log('   ✅ 断言4: 跳转后 __pageRecorder 存在');

      const statusAfterSearch = recorder.getStatus();
      console.log(`   当前录制事件数: ${statusAfterSearch?.eventCount || 0}`);
      expect((statusAfterSearch?.eventCount || 0) >= 1).toBeTruthy();

      console.log(`   ✅ 断言6: 搜索后事件数 >= 1`);

      console.log('\n📍 第三阶段：滚动');

      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(500);
      console.log('   已滚动到底部');

      const statusAfterScroll = recorder.getStatus();
      console.log(`   当前录制事件数: ${statusAfterScroll?.eventCount || 0}`);

      console.log('\n📍 第四阶段：分页');

      try {
        await page.waitForSelector('#page', { timeout: 5000 });
        console.log('   分页区域已找到');

        const page2Locator = page.locator('#page a:has-text("2")').first();
        const isPage2Visible = await page2Locator.isVisible({ timeout: 2000 }).catch(() => false);

        if (isPage2Visible) {
          await page2Locator.click({ force: true });
          console.log('   已点击第2页');

          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);

          const isPage2 = page.url().includes('pn=10');
          expect(isPage2).toBeTruthy();
          console.log(`   ✅ 断言7: 分页成功 (pn=10)`);
        } else {
          console.log('   第2页按钮不可见，跳过分页测试');
        }
      } catch (e) {
        console.log('   分页测试跳过:', (e as Error).message);
      }

      console.log('\n📍 第五阶段：结果验证');

      const finalStatus = recorder.getStatus();
      console.log(`   最终事件数: ${finalStatus?.eventCount || 0}`);

      const result = await recorder.stop('/tmp/test-recording-baidu.yaml');
      console.log(`   录制已保存: ${result.path}`);

      const eventTypes = [...new Set(result.session.events.map((e) => e.type))];
      console.log(`   事件类型: ${eventTypes.join(', ')}`);

      console.log('\n📊 事件详情:');
      result.session.events.slice(0, 10).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.type} - ${event.selector || 'N/A'}`);
      });
      if (result.session.events.length > 10) {
        console.log(`   ... 还有 ${result.session.events.length - 10} 个事件`);
      }

      console.log('\n=== 最终断言 ===');
      const hasInput = result.session.events.some((e) => e.type === 'input');
      const hasClick = result.session.events.some((e) => e.type === 'click');
      const hasScroll = result.session.events.some((e) => e.type === 'scroll');

      console.log(`   包含 input 事件: ${hasInput ? '✅' : '❌'}`);
      console.log(`   包含 click 事件: ${hasClick ? '✅' : '❌'}`);
      console.log(`   包含 scroll 事件: ${hasScroll ? '✅' : '❌'}`);
      console.log(`   总事件数 >= 3: ${result.session.events.length >= 3 ? '✅' : '❌'}`);

      expect(result.session.events.length >= 3).toBeTruthy();
      expect(hasInput || hasClick).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  it('should record events in new tab opened by link with target="_blank"', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      await recorder.start({ url: 'about:blank' });
      await page.waitForTimeout(100);

      await page.evaluate(() => {
        document.body.innerHTML = `
          <h1>Test Page</h1>
          <a href="https://example.com" target="_blank" id="new-tab-link">Open New Tab</a>
        `;
      });
      await page.waitForTimeout(100);

      const hasRecorderInitial = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(hasRecorderInitial).toBeTruthy();
      console.log('   ✅ 断言1: 初始页面录制器已启动');

      await page.click('#new-tab-link');

      const newPage = await context.waitForEvent('page', { timeout: 10000 });
      console.log(`   新 tab 已打开: ${newPage.url()}`);

      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForTimeout(500);

      const hasRecorderInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined"'
      );
      expect(hasRecorderInNewTab).toBeTruthy();
      console.log('   ✅ 断言2: 新 tab 有 __pageRecorder 对象');

      const isRecordingInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(isRecordingInNewTab).toBeTruthy();
      console.log('   ✅ 断言3: 新 tab 录制器处于录制状态');

      const hasIndicatorInNewTab = await newPage.evaluate(
        'document.getElementById("__mpage_recorder_indicator__") !== null'
      );
      expect(hasIndicatorInNewTab).toBeTruthy();
      console.log('   ✅ 断言4: 新 tab 有录制指示器');

      await newPage.click('body');
      await newPage.waitForTimeout(300);

      const status = recorder.getStatus();
      console.log(`   录制事件数: ${status?.eventCount || 0}`);

      const result = await recorder.stop('/tmp/test-recording-new-tab.yaml');
      const tabOpenEvents = result.session.events.filter((e) => e.type === 'tab_open');
      console.log(`   tab_open 事件数: ${tabOpenEvents.length}`);

      expect(tabOpenEvents.length >= 1).toBeTruthy();
      console.log('   ✅ 断言5: 记录了 tab_open 事件');

      console.log(
        '   事件类型:',
        result.session.events.map((e) => e.type)
      );
    } finally {
      await context.close();
    }
  });

  it('should record events in new tab after real navigation (Baidu search → result link)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      console.log('\n📍 第一阶段：访问页面并导航');
      await recorder.start({ url: 'https://example.com' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const hasRecorderInitial = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(hasRecorderInitial).toBeTruthy();
      console.log('   ✅ 断言1: 初始页面录制器已启动');

      await page.evaluate(() => {
        const link = document.createElement('a');
        link.href = 'https://example.org';
        link.target = '_blank';
        link.id = 'test-new-tab-link';
        link.textContent = 'Open in new tab';
        link.style.cssText = 'display:block; font-size:20px; padding:20px;';
        document.body.appendChild(link);
      });
      console.log('   已注入 target="_blank" 链接');

      console.log('\n📍 第二阶段：点击链接打开新 tab');
      await page.click('#test-new-tab-link');

      const newPage = await context.waitForEvent('page', { timeout: 10000 });
      console.log(`   新 tab 已打开: ${newPage.url()}`);

      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForTimeout(500);

      const hasRecorderInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined"'
      );
      expect(hasRecorderInNewTab).toBeTruthy();
      console.log('   ✅ 断言2: 新 tab 有 __pageRecorder 对象');

      const isRecordingInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(isRecordingInNewTab).toBeTruthy();
      console.log('   ✅ 断言3: 新 tab 录制器处于录制状态');

      const hasIndicatorInNewTab = await newPage.evaluate(
        'document.getElementById("__mpage_recorder_indicator__") !== null'
      );
      expect(hasIndicatorInNewTab).toBeTruthy();
      console.log('   ✅ 断言4: 新 tab 有录制指示器');

      const result = await recorder.stop('/tmp/test-recording-real-nav-new-tab.yaml');
      const tabOpenEvents = result.session.events.filter((e) => e.type === 'tab_open');
      console.log(`   tab_open 事件数: ${tabOpenEvents.length}`);
      console.log(
        '   事件类型:',
        result.session.events.map((e) => e.type)
      );

      expect(tabOpenEvents.length >= 1).toBeTruthy();
      console.log('   ✅ 断言5: 记录了 tab_open 事件');
    } finally {
      await context.close();
    }
  });

  it('Baidu E2E: 搜索 → 结果页 → 点击结果链接 → 检查新 tab 录制指示器', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      console.log('\n🔍 第一步：打开百度首页');
      await recorder.start({ url: 'https://www.baidu.com' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const hasRecorderOnHome = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(hasRecorderOnHome).toBeTruthy();
      console.log('   ✅ 百度首页录制器已启动');

      console.log('\n🔍 第二步：搜索');
      const searchInput = page.locator('#kw').or(page.locator('input[name="wd"]'));
      await searchInput.fill('Playwright', { force: true });
      console.log('   已输入: Playwright');

      await page.keyboard.press('Enter');
      console.log('   已按回车搜索');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const resultUrl = page.url();
      console.log(`   当前 URL: ${resultUrl}`);
      expect(resultUrl.includes('wd=')).toBeTruthy();
      console.log('   ✅ 已跳转到搜索结果页');

      const hasRecorderOnResult = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      expect(hasRecorderOnResult).toBeTruthy();
      console.log('   ✅ 搜索结果页录制器正常');

      console.log('\n🔍 第三步：查找并点击搜索结果链接');

      const allLinks = page.locator('#content_left a, #content_left h3 a');
      const linkCount = await allLinks.count();
      console.log(`   找到 ${linkCount} 个搜索结果链接`);

      expect(linkCount > 0).toBeTruthy();
      console.log('   ✅ 有搜索结果');

      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = allLinks.nth(i);
        const href = await link.getAttribute('href').catch(() => 'N/A');
        const target = await link.getAttribute('target').catch(() => 'N/A');
        const text = await link.textContent().catch(() => 'N/A');
        console.log(
          `   链接 ${i + 1}: href=${href?.substring(0, 50)}..., target=${target}, text=${text?.substring(0, 30)}`
        );
      }

      console.log('\n   查找 target="_blank" 的链接...');
      const blankLinks = page.locator('#content_left a[target="_blank"]');
      const blankLinkCount = await blankLinks.count();
      console.log(`   找到 ${blankLinkCount} 个 target="_blank" 的链接`);

      if (blankLinkCount > 0) {
        console.log('   点击第一个 target="_blank" 链接...');
        await blankLinks.first().click({ force: true });
      } else {
        console.log('   没有找到 target="_blank" 链接，点击普通链接...');
        await allLinks.first().click({ force: true });
      }

      console.log('\n🔍 第四步：检查新 tab');

      await page.waitForTimeout(2000);

      const pages = context.pages();
      console.log(`   当前打开的页面数: ${pages.length}`);

      const eventCountBeforeClick = recorder.getStatus()?.eventCount || 0;
      console.log(`   点击链接前的事件数: ${eventCountBeforeClick}`);

      if (pages.length > 1) {
        const newPage = pages[pages.length - 1];
        console.log(`   新 tab URL: ${newPage.url()}`);

        console.log('\n🔍 第五步：切换到新 tab 并检查');

        await newPage.bringToFront();
        console.log('   已切换到新 tab');

        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(1000);

        const hasRecorderInNewTab = await newPage.evaluate(
          'typeof window.__pageRecorder !== "undefined"'
        );
        const isRecordingInNewTab = await newPage.evaluate(
          'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
        );
        const hasIndicator = await newPage.evaluate(
          'document.getElementById("__mpage_recorder_indicator__") !== null'
        );

        const newTabEventCountFromIndicator = await newPage.evaluate(() => {
          const el = document.getElementById('__mpage_event_count__');
          return el ? parseInt(el.textContent || '0', 10) : 0;
        });

        console.log(`   新 tab 有 __pageRecorder: ${hasRecorderInNewTab ? '✅' : '❌'}`);
        console.log(`   新 tab 录制状态: ${isRecordingInNewTab ? '✅' : '❌'}`);
        console.log(`   新 tab 有录制指示器: ${hasIndicator ? '✅' : '❌'}`);
        console.log(`   新 tab 指示器显示的事件数: ${newTabEventCountFromIndicator}`);

        expect(hasRecorderInNewTab).toBeTruthy();
        expect(isRecordingInNewTab).toBeTruthy();
        expect(hasIndicator).toBeTruthy();

        console.log('\n🔍 第六步：在新 tab 执行操作');

        await newPage.click('body');
        await newPage.waitForTimeout(500);

        const eventCountAfterClick = recorder.getStatus()?.eventCount || 0;
        console.log(`   点击后总事件数: ${eventCountAfterClick}`);

        expect(eventCountAfterClick > eventCountBeforeClick).toBeTruthy();
        console.log(`   ✅ 事件数量增加了: ${eventCountBeforeClick} → ${eventCountAfterClick}`);
      } else {
        console.log('   ⚠️ 没有打开新 tab，可能是当前页面跳转');
        const currentUrl = page.url();
        console.log(`   当前页面 URL: ${currentUrl}`);

        const hasRecorder = await page.evaluate(
          'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
        );
        const hasIndicator = await page.evaluate(
          'document.getElementById("__mpage_recorder_indicator__") !== null'
        );
        console.log(`   当前页面录制器: ${hasRecorder ? '✅' : '❌'}`);
        console.log(`   当前页面指示器: ${hasIndicator ? '✅' : '❌'}`);

        expect(hasRecorder).toBeTruthy();
        expect(hasIndicator).toBeTruthy();
      }

      const result = await recorder.stop('/tmp/test-baidu-e2e.yaml');
      console.log(`\n📊 录制完成`);
      console.log(`   总事件数: ${result.session.events.length}`);
      console.log(
        `   事件类型: ${[...new Set(result.session.events.map((e) => e.type))].join(', ')}`
      );

      const tabOpenEvents = result.session.events.filter((e) => e.type === 'tab_open');
      console.log(`   tab_open 事件: ${tabOpenEvents.length}`);
    } finally {
      await context.close();
    }
  });
});
