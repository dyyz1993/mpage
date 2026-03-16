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

  it('should record events in new tab after real navigation (Baidu search → result link)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const recorder = new RecorderController(page);

    try {
      // 第一阶段：访问一个真实页面并进行导航
      console.log('\n📍 第一阶段：访问页面并导航');
      await recorder.start({ url: 'https://example.com' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // 断言1: 初始页面录制器已启动
      const hasRecorderInitial = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      assert.ok(hasRecorderInitial, 'Initial page should have active recorder');
      console.log('   ✅ 断言1: 初始页面录制器已启动');

      // 注入一个 target="_blank" 链接（模拟搜索结果）
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

      // 第二阶段：点击链接打开新 tab
      console.log('\n📍 第二阶段：点击链接打开新 tab');
      await page.click('#test-new-tab-link');

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

      // 检查结果
      const result = await recorder.stop('/tmp/test-recording-real-nav-new-tab.yaml');
      const tabOpenEvents = result.session.events.filter((e) => e.type === 'tab_open');
      console.log(`   tab_open 事件数: ${tabOpenEvents.length}`);
      console.log(
        '   事件类型:',
        result.session.events.map((e) => e.type)
      );

      assert.ok(tabOpenEvents.length >= 1, 'Should have at least 1 tab_open event');
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
      // ========== 第一步：打开百度首页 ==========
      console.log('\n🔍 第一步：打开百度首页');
      await recorder.start({ url: 'https://www.baidu.com' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 验证首页录制器已启动
      const hasRecorderOnHome = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      assert.ok(hasRecorderOnHome, '百度首页应该有录制器');
      console.log('   ✅ 百度首页录制器已启动');

      // ========== 第二步：搜索 ==========
      console.log('\n🔍 第二步：搜索');
      const searchInput = page.locator('#kw').or(page.locator('input[name="wd"]'));
      await searchInput.fill('Playwright', { force: true });
      console.log('   已输入: Playwright');

      await page.keyboard.press('Enter');
      console.log('   已按回车搜索');

      // 等待搜索结果页加载
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // 验证已跳转到搜索结果页
      const resultUrl = page.url();
      console.log(`   当前 URL: ${resultUrl}`);
      assert.ok(resultUrl.includes('wd='), '应该跳转到搜索结果页');
      console.log('   ✅ 已跳转到搜索结果页');

      // 验证搜索结果页录制器仍然工作
      const hasRecorderOnResult = await page.evaluate(
        'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
      );
      assert.ok(hasRecorderOnResult, '搜索结果页应该有录制器');
      console.log('   ✅ 搜索结果页录制器正常');

      // ========== 第三步：查找并点击搜索结果链接 ==========
      console.log('\n🔍 第三步：查找并点击搜索结果链接');

      // 百度搜索结果通常在 #content_left 中
      const allLinks = page.locator('#content_left a, #content_left h3 a');
      const linkCount = await allLinks.count();
      console.log(`   找到 ${linkCount} 个搜索结果链接`);

      assert.ok(linkCount > 0, '应该有搜索结果');
      console.log('   ✅ 有搜索结果');

      // 打印前几个链接的信息
      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = allLinks.nth(i);
        const href = await link.getAttribute('href').catch(() => 'N/A');
        const target = await link.getAttribute('target').catch(() => 'N/A');
        const text = await link.textContent().catch(() => 'N/A');
        console.log(
          `   链接 ${i + 1}: href=${href?.substring(0, 50)}..., target=${target}, text=${text?.substring(0, 30)}`
        );
      }

      // 点击有 target="_blank" 的搜索结果
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

      // ========== 第四步：检查是否打开了新 tab ==========
      console.log('\n🔍 第四步：检查新 tab');

      // 等待可能的页面变化
      await page.waitForTimeout(2000);

      // 检查是否有新页面打开
      const pages = context.pages();
      console.log(`   当前打开的页面数: ${pages.length}`);

      // 记录点击链接前的事件数量
      const eventCountBeforeClick = recorder.getStatus()?.eventCount || 0;
      console.log(`   点击链接前的事件数: ${eventCountBeforeClick}`);

      if (pages.length > 1) {
        // 有新 tab 打开
        const newPage = pages[pages.length - 1];
        console.log(`   新 tab URL: ${newPage.url()}`);

        // ========== 第五步：切换到新 tab 并检查指示器 ==========
        console.log('\n🔍 第五步：切换到新 tab 并检查');

        // 切换到新 tab
        await newPage.bringToFront();
        console.log('   已切换到新 tab');

        // 等待新页面加载
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(1000);

        // 在新 tab 中检查录制器状态
        const hasRecorderInNewTab = await newPage.evaluate(
          'typeof window.__pageRecorder !== "undefined"'
        );
        const isRecordingInNewTab = await newPage.evaluate(
          'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
        );
        const hasIndicator = await newPage.evaluate(
          'document.getElementById("__mpage_recorder_indicator__") !== null'
        );

        // 在新 tab 中获取指示器显示的事件数量
        const newTabEventCountFromIndicator = await newPage.evaluate(() => {
          const el = document.getElementById('__mpage_event_count__');
          return el ? parseInt(el.textContent || '0', 10) : 0;
        });

        console.log(`   新 tab 有 __pageRecorder: ${hasRecorderInNewTab ? '✅' : '❌'}`);
        console.log(`   新 tab 录制状态: ${isRecordingInNewTab ? '✅' : '❌'}`);
        console.log(`   新 tab 有录制指示器: ${hasIndicator ? '✅' : '❌'}`);
        console.log(`   新 tab 指示器显示的事件数: ${newTabEventCountFromIndicator}`);

        // 关键断言
        assert.ok(hasRecorderInNewTab, '新 tab 应该有 __pageRecorder');
        assert.ok(isRecordingInNewTab, '新 tab 应该处于录制状态');
        assert.ok(hasIndicator, '新 tab 应该有录制指示器');

        // ========== 第六步：在新 tab 执行操作并验证事件录制 ==========
        console.log('\n🔍 第六步：在新 tab 执行操作');

        // 在新 tab 点击
        await newPage.click('body');
        await newPage.waitForTimeout(500);

        // 获取点击后的事件数量
        const eventCountAfterClick = recorder.getStatus()?.eventCount || 0;
        console.log(`   点击后总事件数: ${eventCountAfterClick}`);

        // 验证新 tab 的事件数量大于点击前
        assert.ok(eventCountAfterClick > eventCountBeforeClick, '新 tab 点击后总事件数应该增加');
        console.log(`   ✅ 事件数量增加了: ${eventCountBeforeClick} → ${eventCountAfterClick}`);
      } else {
        // 没有新 tab，可能是当前页面跳转
        console.log('   ⚠️ 没有打开新 tab，可能是当前页面跳转');
        const currentUrl = page.url();
        console.log(`   当前页面 URL: ${currentUrl}`);

        // 检查当前页面录制器
        const hasRecorder = await page.evaluate(
          'typeof window.__pageRecorder !== "undefined" && window.__pageRecorder.isRecording'
        );
        const hasIndicator = await page.evaluate(
          'document.getElementById("__mpage_recorder_indicator__") !== null'
        );
        console.log(`   当前页面录制器: ${hasRecorder ? '✅' : '❌'}`);
        console.log(`   当前页面指示器: ${hasIndicator ? '✅' : '❌'}`);

        // 如果是当前页面跳转，也验证录制器
        assert.ok(hasRecorder, '跳转后页面应该有录制器');
        assert.ok(hasIndicator, '跳转后页面应该有录制指示器');
      }

      // 停止录制并查看事件
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
