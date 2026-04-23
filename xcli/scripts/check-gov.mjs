import { chromium } from 'playwright';

const TARGET = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';

const browser = await chromium.launch({
  executablePath: process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium'
});
const context = await browser.newContext();
const page = await context.newPage();

console.log('=== 1. 打开页面 ===');
await page.goto(`${TARGET}/examples/33-government-bidding.html?study`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('=== 2. 点击登录按钮 ===');
await page.evaluate(() => {
  const btn = document.querySelector('.auth-buttons .btn-login');
  if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(2000);

console.log('=== 3. 获取滑块验证码 ===');
const captchaRes = await context.request.get(`${TARGET}/examples/33/slider-captcha`);
const { captchaId, targetX } = await captchaRes.json();
console.log('   captchaId:', captchaId);
console.log('   targetX:', targetX);

const sliderBg = page.locator('.slider-bg');
const sliderKnob = page.locator('.slider-knob');
const sliderBox = await sliderBg.boundingBox();
const knobBox = await sliderKnob.boundingBox();

console.log('=== 4. 拖动滑块 ===');
if (sliderBox && knobBox) {
  const startX = knobBox.x + knobBox.width / 2;
  const startY = knobBox.y + knobBox.height / 2;
  const endX = sliderBox.x + targetX;
  const endY = startY;

  console.log(`   从 (${startX}, ${startY}) 拖动到 (${endX}, ${endY})`);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();
}

await page.waitForTimeout(1500);

console.log('=== 5. 验证滑块 ===');
const verifyRes = await context.request.post(`${TARGET}/examples/33/verify-slider`, {
  data: { captchaId, x: targetX }
});
const verifyData = await verifyRes.json();
console.log('   验证结果:', verifyData);

if (!verifyData.success) {
  console.error('滑块验证失败!');
  await browser.close();
  process.exit(1);
}

console.log('=== 6. 填写用户名密码 ===');
await page.fill('#username', 'admin');
await page.fill('input[type="password"]', 'password');
await page.waitForTimeout(500);

console.log('=== 7. 点击登录 ===');
await page.evaluate(() => {
  const loginBtn = document.querySelector('.login-btn');
  if (loginBtn) loginBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

await page.waitForTimeout(3000);

console.log('=== 8. 检查登录状态 ===');
const loginState = await page.evaluate(() => {
  const userInfo = document.querySelector('.user-info .username');
  return userInfo ? userInfo.textContent : null;
});
console.log('   登录状态:', loginState || '未登录');

const localStorageToken = await page.evaluate(() => localStorage.getItem('auth_token'));
console.log('   Token:', localStorageToken || '无');

console.log('\n=== 9. 测试获取公告列表（无需登录）===');
const noticesRes = await context.request.get(`${TARGET}/examples/33/notices`, {
  params: { keyword: '医疗设备', region: 'beijing', page: 1 }
});
const noticesData = await noticesRes.json();
console.log('   总数:', noticesData.totalCount);
console.log('   第一条公告标题:', noticesData.notices?.[0]?.title);
console.log('   第一条公告发布日期:', noticesData.notices?.[0]?.publishDate);

console.log('\n=== 10. 测试获取公告详情 ===');
if (noticesData.notices?.length > 0) {
  const noticeId = noticesData.notices[0].id;
  const detailRes = await context.request.get(`${TARGET}/examples/33/notice/${noticeId}`);
  const detail = await detailRes.json();
  console.log('   ID:', detail.id);
  console.log('   标题:', detail.title);
  console.log('   类型:', detail.typeText);
  console.log('   预算:', detail.budget);
  console.log('   内容长度:', detail.content?.length || 0);
  console.log('   附件数:', detail.attachments?.length || 0);

  if (detail.attachments?.length > 0) {
    console.log('\n=== 11. 测试附件下载（需要登录）===');
    const attachmentId = detail.attachments[0].id;
    console.log('   附件:', detail.attachments[0]);

    const attachResNoAuth = await context.request.get(`${TARGET}/examples/33/attachment/${attachmentId}`);
    console.log('   无 Token 响应状态:', attachResNoAuth.status(), attachResNoAuth.status() === 403 ? '(需要登录)' : '');

    const cookies = await context.cookies();
    const sessionToken = cookies.find(c => c.name === 'session_token')?.value;

    if (localStorageToken || sessionToken) {
      const headers = {
        'Authorization': `Bearer ${localStorageToken || sessionToken}`
      };
      const attachResAuth = await context.request.get(`${TARGET}/examples/33/attachment/${attachmentId}`, {
        headers
      });
      console.log('   有 Token 响应状态:', attachResAuth.status());
      if (attachResAuth.status() === 200) {
        const contentType = attachResAuth.headers()['content-type'];
        console.log('   Content-Type:', contentType);
        console.log('   附件下载成功!');
      }
    }
  }
}

await browser.close();
console.log('\n=== 所有测试完成 ===');
console.log('\n=== 校验信息汇总 ===');
console.log('1. 第一条公告标题:', noticesData.notices?.[0]?.title);
console.log('2. 第一条公告发布日期:', noticesData.notices?.[0]?.publishDate);
console.log('3. 公告总数:', noticesData.totalCount);