const { chromium } = require("playwright");
const { humanize } = require("./src/server/humanize");

const PAGE_URL = "file://" + process.cwd() + "/tests/fixtures/bot-detector.html";
const CHROMIUM = "/Applications/Chromium.app/Contents/MacOS/Chromium";

async function runAllCases(page, mode) {
  const h = mode === "humanized" ? humanize(page) : null;

  const doClick = async (sel) => { h ? await h.click(sel) : await page.click(sel); };
  const doFill = async (sel, text) => { h ? await h.fill(sel, text) : await page.fill(sel, text); };
  const doHover = async (sel) => { h ? await h.hover(sel) : await page.hover(sel); };
  const wait = (ms) => page.waitForTimeout(ms);

  const start = Date.now();

  // Case 1: Basic clicks
  await doClick("#btn-a");
  await doClick("#btn-b");
  await doFill("#input-name", "test user");
  await doClick("#btn-c");
  await doClick("#btn-d");
  await doClick("#btn-e");

  // Case 2: Hover
  await doHover("#hover-box-1");
  await wait(h ? 500 : 100);
  await doHover("#hover-box-2");
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
  await doClick("#dropdown-trigger");
  await wait(h ? 300 : 50);
  await doClick(".dropdown-option:nth-child(2)");

  // Case 5: Slider
  if (h) {
    const slider = await page.$("#slider-thumb");
    const box = await slider.boundingBox();
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
    const slider = await page.$("#slider-thumb");
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + box.height / 2);
      await page.mouse.up();
    }
  }

  // Case 6: Multi-step form
  await doFill("#form-name", "Alice");
  await doFill("#form-email", "alice@test.com");
  await doClick("#form-next-btn");
  await wait(h ? 300 : 50);
  await doFill("#form-city", "Shanghai");
  await doFill("#form-phone", "13800138000");
  await doClick("#form-submit-btn");

  const duration = Date.now() - start;

  const result = await page.evaluate(() => {
    return {
      score: parseInt(document.getElementById("bot-score").textContent || "0"),
      verdict: document.getElementById("verdict").textContent || "",
      moves: document.getElementById("move-count").textContent || "0",
      clicks: document.getElementById("click-count").textContent || "0",
      teleport: document.getElementById("teleport-clicks").textContent || "0",
      offsetStd: document.getElementById("click-offset-std").textContent || "-",
      mdGap: document.getElementById("md-click-gap").textContent || "-",
    };
  });

  return { mode, ...result, duration };
}

function printResult(r) {
  const scoreColor = r.score < 20 ? "\x1b[32m" : r.score < 50 ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  console.log("");
  console.log("  " + (r.mode === "native" ? "Playwright Native" : "Humanized (mpage)") + ":");
  console.log("  Bot Score:  " + scoreColor + r.score + "/100" + reset + "  Verdict: " + scoreColor + r.verdict + reset);
  console.log("  " + dim + "Duration: " + r.duration + "ms | Moves: " + r.moves + " | Clicks: " + r.clicks + " | Teleport: " + r.teleport + reset);
  console.log("  " + dim + "Offset Std: " + r.offsetStd + " | MD\u2192Click Gap: " + r.mdGap + reset);
}

async function main() {
  console.log("");
  console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("  \u2551   Bot Detector - Full Test Suite         \u2551");
  console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
  console.log("");
  console.log("  Cases: click, hover, scroll, dropdown, slider, form");
  console.log("");

  console.log("  \u2500\u2500 Round 1: Playwright Native \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  const browser1 = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const page1 = await browser1.newPage();
  await page1.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
  await page1.waitForTimeout(500);
  const nativeResult = await runAllCases(page1, "native");
  printResult(nativeResult);
  await browser1.close();

  console.log("");
  console.log("  \u2500\u2500 Round 2: Humanized (mpage) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  const browser2 = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const page2 = await browser2.newPage();
  await page2.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(500);
  const humanResult = await runAllCases(page2, "humanized");
  printResult(humanResult);
  await browser2.close();

  console.log("");
  console.log("  \u2500\u2500 Summary \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log("");
  console.log("  Native Playwright:   " + nativeResult.score + "/100  " + nativeResult.verdict);
  console.log("  Humanized (mpage):   " + humanResult.score + "/100  " + humanResult.verdict);
  console.log("");

  if (humanResult.score < nativeResult.score) {
    console.log("  \u2705 Humanized module reduces bot score by " + (nativeResult.score - humanResult.score) + " points");
  } else {
    console.log("  \u26a0\ufe0f  Humanized module did not improve the score");
  }
  console.log("");
}

main().catch(console.error);
