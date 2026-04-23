#!/usr/bin/env node

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function scrapeOrders() {
  console.error('=== 电商订单采集系统 ===\n');

  console.error('1. 获取验证码...');
  const captchaRes = await fetchJSON(`${BASE_URL}/examples/32/captcha`);
  const captcha = captchaRes.captcha;
  console.error(`   验证码: ${captcha}`);

  console.error('\n2. 登录...');
  const loginRes = await fetchJSON(`${BASE_URL}/examples/32/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'password',
      captcha: captcha
    })
  });

  if (!loginRes.success) {
    throw new Error(`登录失败: ${loginRes.message}`);
  }

  const token = loginRes.token;
  console.error(`   登录成功! Token: ${token.slice(0, 20)}...`);

  const headers = { 'Authorization': `Bearer ${token}` };

  console.error('\n3. 获取订单列表 (第1页)...');
  const firstPage = await fetchJSON(`${BASE_URL}/examples/32/orders?page=1`, { headers });
  const { totalOrders, totalPages } = firstPage;

  console.error(`   总订单数: ${totalOrders}`);
  console.error(`   总页数: ${totalPages}`);
  console.error(`   每页: ${firstPage.pageSize} 条`);

  const allOrders = [...firstPage.orders];

  console.error('\n4. 遍历所有页面...');
  for (let page = 2; page <= totalPages; page++) {
    process.stderr.write(`   采集第 ${page}/${totalPages} 页...\n`);
    const res = await fetchJSON(`${BASE_URL}/examples/32/orders?page=${page}`, { headers });
    allOrders.push(...res.orders);
  }

  console.error(`   完成! 共采集 ${allOrders.length} 条订单\n`);

  console.error('5. 获取第一条订单详情...');
  const firstOrderId = allOrders[0].orderId;
  const detail = await fetchJSON(`${BASE_URL}/examples/32/order/${firstOrderId}`, { headers });

  console.error('\n=== 校验结果 ===\n');
  console.error(`1. 第一条订单的订单号: ${allOrders[0].orderId}`);
  console.error(`2. 订单列表的总页数: ${totalPages}`);
  console.error(`3. 订单总数量: ${totalOrders}`);
  console.error(`4. 第一条订单详情:`);
  console.error(JSON.stringify(detail, null, 2));

  const result = {
    summary: {
      totalOrders,
      totalPages,
      firstOrderId: allOrders[0].orderId
    },
    firstOrderDetail: detail,
    allOrders
  };

  console.log(JSON.stringify(result, null, 2));
}

scrapeOrders().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});