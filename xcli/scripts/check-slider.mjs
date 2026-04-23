import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium'
});
const page = await browser.newPage();
await page.goto('https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/33-government-bidding.html?study', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const structure = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).map(b => ({class: b.className, text: b.textContent?.trim()}));
  const navbar = document.querySelector('.navbar');
  const topBar = document.querySelector('.top-bar');
  return {
    buttons,
    navbarHTML: navbar ? navbar.outerHTML.slice(0, 300) : 'NOT FOUND',
    topBarHTML: topBar ? topBar.outerHTML.slice(0, 300) : 'NOT FOUND'
  };
});
console.log(JSON.stringify(structure, null, 2));
await browser.close();