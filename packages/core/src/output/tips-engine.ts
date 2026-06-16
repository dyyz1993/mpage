import type { Tip } from '../tip.js';

const API_TIPS: Record<string, string[]> = {
  'ctx.page': [
    '使用 ctx.page 前务必做 null 检查: if (!ctx.page) return fail("需要浏览器页面")',
    '纯 API 插件不需要 ctx.page，直接用 fetch',
  ],
  storage: [
    'ctx.storage 数据持久化到 ~/.xcli/storage/<plugin-id>.json',
    '登录后用 ctx.storage.set("auth_token", token) 保存 token',
  ],
  NOT_LOGGED_IN: ['使用 xcli <site> login 先登录', '或在 handler 中调用 site.requireLogin()'],
  INVALID_ARGS: [
    '检查 Zod schema 是否用了 z.coerce.number() 而非 z.number()',
    'CLI 参数都是字符串，需要 coerce 转换',
  ],
  ECONNREFUSED: ['检查目标网站是否可访问', '如果是本地服务，确认端口是否正确'],
  Timeout: ['使用 page.waitForSelector() 替代固定等待', '可以设置 timeout: { timeout: 10000 }'],
  'waiting for selector': [
    '选择器可能不正确，先用 page.content() 检查页面结构',
    '考虑使用 waitForLoadState("networkidle") 等待页面完全加载',
  ],
};

export function generateTips(error: Error | string): Tip[] {
  const message = typeof error === 'string' ? error : error.message;
  const tips: Tip[] = [];

  for (const [pattern, suggestions] of Object.entries(API_TIPS)) {
    if (message.includes(pattern) || message.match(new RegExp(pattern, 'i'))) {
      for (const suggestion of suggestions) {
        tips.push({ level: 'warn', message: suggestion, label: 'TROUBLESHOOTING' });
      }
    }
  }

  return tips;
}
