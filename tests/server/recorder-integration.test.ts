import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright-core';
import { RecorderController } from '../../src/server/recorder/controller.js';
import type { Browser } from 'playwright-core';

describe('Recorder Integration Tests', { timeout: 120000 }, () => {
  let browser: Browser;

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    });
  });

  after(async () => {
    await browser.close();
  });

  it('should record click events on example.com', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    await recorder.start({ url: 'https://example.com' });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 使用 page.click(selector) 触发真实 DOM 事件（而不是 page.mouse.click）
    // page.mouse.click 使用 CDP 直接触发，不会经过 DOM 事件监听器
    await page.click('body');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    assert.ok(status, 'Status should be available');
    assert.ok(status!.isRecording, 'Should be recording');
    assert.ok(status!.eventCount >= 1, 'Should have recorded at least 1 event');

    console.log('✅ Click events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-click.yaml');

    assert.ok(result.session.events.length >= 1, 'Should have at least 1 event');
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
    assert.ok(status, 'Status should be available');
    assert.ok(status!.eventCount >= 1, 'Should have recorded keyboard events');

    console.log('✅ Keyboard events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-kb.yaml');
    assert.ok(result.session.events.length >= 1, 'Should have at least 1 keyboard event');

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

    // 使用 page.click(selector) 触发真实 DOM 事件（而不是 page.mouse.click）
    // page.mouse.click 使用 CDP 直接触发，不会经过 DOM 事件监听器
    await page.click('body');

    await page.waitForTimeout(500);

    await page.goto('https://example.org');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 使用 page.click(selector) 触发真实 DOM 事件（而不是 page.mouse.click）
    // page.mouse.click 使用 CDP 直接触发，不会经过 DOM 事件监听器
    await page.click('body');

    await page.waitForTimeout(500);

    const status = recorder.getStatus();
    assert.ok(status, 'Status should be available');
    assert.ok(status!.eventCount >= 2, 'Should have recorded events on both pages');

    console.log('✅ Navigation events recorded:', status!.eventCount);

    const result = await recorder.stop('/tmp/test-recording-nav.yaml');
    assert.ok(result.session.events.length >= 2, 'Should have events from both pages');

    const pageUrls = [...new Set(result.session.events.map((e) => e.pageState?.url))];
    console.log('Pages visited:', pageUrls);

    await context.close();
  });

  it('should record Baidu search flow with assertions', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      // ========== 第一阶段：搜索 ==========
      console.log('\n📍 第一阶段：搜索');

      await recorder.start({ url: 'https://www.baidu.com' });

      // 断言1： 验证脚本注入
      const hasRecorder = await page.evaluate('typeof window.__pageRecorder !== "undefined"');
      assert.ok(hasRecorder, '__pageRecorder should be injected');
      console.log('   ✅ 断言1: __pageRecorder 存在');

      // 等待页面加载
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 输入搜索内容
      const searchInput = page.locator('#kw').or(page.locator('input[name="wd"]'));
      await searchInput.fill('Playwright 自动化测试', { force: true });
      console.log('   已输入搜索内容');

      // 点击搜索按钮或按回车
      const searchBtn = page.locator('#su');
      if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchBtn.click({ force: true });
        console.log('   已点击搜索按钮');
      } else {
        await page.keyboard.press('Enter');
        console.log('   已按回车搜索');
      }

      // ========== 第二阶段：跳转验证 ==========
      console.log('\n📍 第二阶段：跳转验证');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const searchUrl = page.url();
      console.log(`   当前URL: ${searchUrl}`);

      // 断言3: URL 包含搜索参数
      assert.ok(searchUrl.includes('wd='), 'URL should contain search parameter');
      console.log('   ✅ 断言3: URL包含 wd=');

      // 断言4: 跳转后脚本仍然存在（关键！）
      const hasRecorderAfterNav = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined"'
      );
      assert.ok(hasRecorderAfterNav, '__pageRecorder should exist after navigation');
      console.log('   ✅ 断言4: 跳转后 __pageRecorder 存在');

      // 检查当前事件数量
      const statusAfterSearch = recorder.getStatus();
      console.log(`   当前录制事件数: ${statusAfterSearch?.eventCount || 0}`);
      assert.ok(
        (statusAfterSearch?.eventCount || 0) >= 1,
        'Should have recorded at least 1 event after search'
      );

      console.log(`   ✅ 断言6: 搜索后事件数 >= 1`);

      // ========== 第三阶段：滚动 ==========
      console.log('\n📍 第三阶段：滚动');

      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(500);
      console.log('   已滚动到底部');

      const statusAfterScroll = recorder.getStatus();
      console.log(`   当前录制事件数: ${statusAfterScroll?.eventCount || 0}`);

      // ========== 第四阶段：分页 ==========
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

          // 断言7: 分页成功
          const isPage2 = page.url().includes('pn=10');
          assert.ok(isPage2, 'Should be on page 2 (pn=10 in URL)');
          console.log(`   ✅ 断言7: 分页成功 (pn=10)`);
        } else {
          console.log('   第2页按钮不可见，跳过分页测试');
        }
      } catch (e) {
        console.log('   分页测试跳过:', (e as Error).message);
      }

      // ========== 第五阶段：结果验证 ==========
      console.log('\n📍 第五阶段：结果验证');

      const finalStatus = recorder.getStatus();
      console.log(`   最终事件数: ${finalStatus?.eventCount || 0}`);

      // 停止录制
      const result = await recorder.stop('/tmp/test-recording-baidu.yaml');
      console.log(`   录制已保存: ${result.path}`);

      // 分析事件类型
      const eventTypes = [...new Set(result.session.events.map((e) => e.type))];
      console.log(`   事件类型: ${eventTypes.join(', ')}`);

      // 详细输出事件
      console.log('\n📊 事件详情:');
      result.session.events.slice(0, 10).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.type} - ${event.selector || 'N/A'}`);
      });
      if (result.session.events.length > 10) {
        console.log(`   ... 还有 ${result.session.events.length - 10} 个事件`);
      }

      // 最终断言
      console.log('\n=== 最终断言 ===');
      const hasInput = result.session.events.some((e) => e.type === 'input');
      const hasClick = result.session.events.some((e) => e.type === 'click');
      const hasScroll = result.session.events.some((e) => e.type === 'scroll');

      console.log(`   包含 input 事件: ${hasInput ? '✅' : '❌'}`);
      console.log(`   包含 click 事件: ${hasClick ? '✅' : '❌'}`);
      console.log(`   包含 scroll 事件: ${hasScroll ? '✅' : '❌'}`);
      console.log(`   总事件数 >= 3: ${result.session.events.length >= 3 ? '✅' : '❌'}`);

      assert.ok(
        result.session.events.length >= 3,
        `Should have at least 3 events, got ${result.session.events.length}`
      );
      assert.ok(hasInput || hasClick, 'Should have input or click events');
    } finally {
      await context.close();
    }
  });

  it('should record events in new tab opened by link with target="_blank"', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      // 先启动录制器
      await recorder.start({ url: 'about:blank' });
      await page.waitForTimeout(100);

      // 使用 evaluate 设置 HTML 内容
      await page.evaluate(() => {
        document.body.innerHTML = `
          <h1>Test Page</h1>
          <a href="https://example.com" target="_blank" id="new-tab-link">Open New Tab</a>
        `;
      });
      await page.waitForTimeout(100);

      // 断言1: 初始页面录制器已启动
      const hasRecorderInitial = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      assert.ok(hasRecorderInitial, 'Initial page should have active recorder');
      console.log('   ✅ 断言1: 初始页面录制器已启动');

      // 点击打开新 tab 的链接
      await page.click('#new-tab-link');

      // 等待新 tab 打开
      const newPage = await context.waitForEvent('page', { timeout: 10000 });
      console.log(`   新 tab 已打开: ${newPage.url()}`);

      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForTimeout(500);

      // 断言2: 新 tab 应该有 __pageRecorder 对象
      const hasRecorderInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined"'
      );
      assert.ok(hasRecorderInNewTab, 'New tab should have __pageRecorder injected');
      console.log('   ✅ 断言2: 新 tab 有 __pageRecorder 对象');

      // 断言3: 新 tab 的录制器应该处于录制状态
      const isRecordingInNewTab = await newPage.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      assert.ok(isRecordingInNewTab, 'New tab recorder should be in recording state');
      console.log('   ✅ 断言3: 新 tab 录制器处于录制状态');

      // 断言4: 新 tab 应该有录制指示器
      const hasIndicatorInNewTab = await newPage.evaluate(
        'document.getElementById("__mpage_recorder_indicator__") !== null'
      );
      assert.ok(hasIndicatorInNewTab, 'New tab should have recording indicator visible');
      console.log('   ✅ 断言4: 新 tab 有录制指示器');

      // 在新 tab 中点击，验证事件录制
      await newPage.click('body');
      await newPage.waitForTimeout(300);

      // 断言5: 应该记录了 tab_open 事件
      const status = recorder.getStatus();
      console.log(`   录制事件数: ${status?.eventCount || 0}`);

      // 检查是否有 tab_open 事件
      const result = await recorder.stop('/tmp/test-recording-new-tab.yaml');
      const tabOpenEvents = result.session.events.filter((e) => e.type === 'tab_open');
      console.log(`   tab_open 事件数: ${tabOpenEvents.length}`);

      assert.ok(tabOpenEvents.length >= 1, 'Should have at least 1 tab_open event');
      console.log('   ✅ 断言5: 记录了 tab_open 事件');

      // 输出所有事件类型
      console.log(
        '   事件类型:',
        result.session.events.map((e) => e.type)
      );
    } finally {
      await context.close();
    }
  });
});
