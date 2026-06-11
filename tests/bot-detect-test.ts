import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { humanize } from '../src/server/humanize';

const PAGE_URL = 'file://' + process.cwd() + '/tests/fixtures/bot-detector.html';
const CHROMIUM = '/Applications/Chromium.app/Contents/MacOS/Chromium';

interface CaseResult {
  name: string;
  mode: 'native' | 'humanized';
  botScore: number;
  verdict: string;
  moveCount: number;
  clickCount: number;
  teleportClicks: number;
  offsetStd: string;
  mdGap: string;
  duration: number;
}

async function runAllCases(page: Page, mode: 'native' | 'humanized'): Promise<CaseResult> {
  const h = mode === 'humanized' ? humanize(page) : null;

  const doClick = async (sel: string) => {
    if (h) {
      await h.click(sel);
    } else {
      await page.click(sel);
    }
  };
  const doFill = async (sel: string, text: string) => {
    if (h) {
      await h.fill(sel, text);
    } else {
      await page.fill(sel, text);
    }
  };
  const doHover = async (sel: string) => {
    if (h) {
      await h.hover(sel);
    } else {
      await page.hover(sel);
    }
  };
  const wait = (ms: number) => page.waitForTimeout(ms);

  const start = Date.now();

  // Case 1: Basic clicks
  await doClick('#btn-a');
  await doClick('#btn-b');
  await doFill('#input-name', 'test user');
  await doClick('#btn-c');
  await doClick('#btn-d');
  await doClick('#btn-e');

  // Case 2: Hover
  await doHover('#hover-box-1');
  await wait(h ? 500 : 100);
  await doHover('#hover-box-2');
  await wait(h ? 500 : 100);

  // Case 3: Scroll
  if (h) {
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 80 + Math.random() * 40);
      await wait(50 + Math.random() * 100);
    }
  } else {
    await page.evaluate("document.querySelector('#scroll-box').scrollTop = 300");
    await wait(100);
  }

  // Case 4: Dropdown
  await doClick('#dropdown-trigger');
  await wait(h ? 300 : 50);
  await doClick('.dropdown-option:nth-child(2)');

  // Case: Hover Menu (hover to open, move to option, click)
  await doHover('#hover-menu-trigger');
  await wait(h ? 400 : 100);
  if (h) {
    const item = await page.$('.hover-menu-item:nth-child(3)');
    const box = await item?.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await wait(100 + Math.random() * 200);
      await page.mouse.click(
        box.x + box.width / 2 + (Math.random() - 0.5) * 20,
        box.y + box.height / 2
      );
    }
  } else {
    await page.hover('.hover-menu-item:nth-child(3)');
    await page.click('.hover-menu-item:nth-child(3)');
  }

  // Case 5: Slider
  if (h) {
    const slider = await page.$('#slider-thumb');
    const box = await slider?.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) {
        await page.mouse.move(startX + i * 5, startY + (Math.random() - 0.5) * 2);
        await wait(15 + Math.random() * 20);
      }
      await page.mouse.up();
    }
  } else {
    const slider = await page.$('#slider-thumb');
    const box = await slider?.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + box.height / 2);
      await page.mouse.up();
    }
  }

  // Case 6: Multi-step form
  await doFill('#form-name', 'Alice');
  await doFill('#form-email', 'alice@test.com');
  await page.click('#form-next-btn');
  await page
    .waitForFunction("document.querySelector('#form-step-2')?.classList.contains('active')", {
      timeout: 10000,
    })
    .catch(() => {});
  await wait(h ? 800 : 200);
  await doFill('#form-city', 'Shanghai');
  await doFill('#form-phone', '13800138000');
  await page.click('#form-submit-btn');

  const duration = Date.now() - start;

  const evalFn = new Function(`return {
      score: parseInt(document.getElementById('bot-score')?.textContent || '0'),
      verdict: document.getElementById('verdict')?.textContent || '',
      moves: document.getElementById('move-count')?.textContent || '0',
      clicks: document.getElementById('click-count')?.textContent || '0',
      teleport: document.getElementById('teleport-clicks')?.textContent || '0',
      offsetStd: document.getElementById('click-offset-std')?.textContent || '-',
      mdGap: document.getElementById('md-click-gap')?.textContent || '-',
    };`);
  const result = await page.evaluate(evalFn);

  return {
    name: 'All Cases',
    mode,
    botScore: result.score,
    verdict: result.verdict,
    moveCount: parseInt(result.moves),
    clickCount: parseInt(result.clicks),
    teleportClicks: parseInt(result.teleport),
    offsetStd: result.offsetStd,
    mdGap: result.mdGap,
    duration,
  };
}

function printResult(r: CaseResult) {
  const scoreColor = r.botScore < 20 ? '\x1b[32m' : r.botScore < 50 ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';

  console.log('');
  console.log(`  ${r.mode === 'native' ? 'Playwright Native' : 'Humanized (mpage)'}:`);
  console.log(
    `  Bot Score:  ${scoreColor}${r.botScore}/100${reset}  Verdict: ${scoreColor}${r.verdict}${reset}`
  );
  console.log(
    `  ${dim}Duration: ${r.duration}ms | Moves: ${r.moveCount} | Clicks: ${r.clickCount} | Teleport: ${r.teleportClicks}${reset}`
  );
  console.log(`  ${dim}Offset Std: ${r.offsetStd} | MD→Click Gap: ${r.mdGap}${reset}`);
}

async function main() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   Bot Detector - Full Test Suite         ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  Test cases: click, hover, scroll, dropdown, slider, form');
  console.log('');

  // Round 1: Native Playwright
  console.log('  ── Round 1: Playwright Native ──────────────');
  const browser1 = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const page1 = await browser1.newPage();
  await page1.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(500);
  const nativeResult = await runAllCases(page1, 'native');
  printResult(nativeResult);
  await browser1.close();

  // Round 2: Humanized
  console.log('');
  console.log('  ── Round 2: Humanized (mpage) ──────────────');
  const browser2 = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const page2 = await browser2.newPage();
  await page2.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(500);
  const humanResult = await runAllCases(page2, 'humanized');
  printResult(humanResult);
  await browser2.close();

  // Summary
  console.log('');
  console.log('  ── Summary ─────────────────────────────────');
  console.log('');
  console.log(`  Native Playwright:   ${nativeResult.botScore}/100  ${nativeResult.verdict}`);
  console.log(`  Humanized (mpage):   ${humanResult.botScore}/100  ${humanResult.verdict}`);
  console.log('');

  if (humanResult.botScore < nativeResult.botScore) {
    console.log(
      '  ✅ Humanized module reduces bot detection score by ' +
        (nativeResult.botScore - humanResult.botScore) +
        ' points'
    );
  } else {
    console.log('  ⚠️  Humanized module did not improve the score');
  }
  console.log('');
}

main().catch(console.error);
