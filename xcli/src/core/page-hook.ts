export interface DetectionResult {
  type: 'captcha' | 'popup' | 'block' | 'error' | null;
  severity: 'low' | 'medium' | 'high';
  message: string;
  details: string[];
  suggestions: string[];
  meta?: {
    captchaId?: string;
    captchaType?: string;
    elementCount?: number;
    selectors?: string[];
  };
}

export interface PageAnalysis {
  html: string;
  url: string;
  title: string;
  elements?: {
    inputs: number;
    images: number;
    buttons: number;
    forms: number;
  };
}

const CAPTCHA_PATTERNS = [
  /captcha/i,
  /验证码/i,
  /验证图片/i,
  /verify.?code/i,
  /security.?code/i,
  /robot.?check/i,
  /不是机器人/i,
  /我不是机器人/i,
  /prove.?you.*human/i,
  /点击验证/i,
  /滑动验证/i,
  /拼图验证/i,
  /请完成验证/i,
  /完成验证/i,
];

const CAPTCHA_TYPE_PATTERNS = [
  { pattern: /滑动验证|滑块/, type: 'slider' },
  { pattern: /点选|点击验证/, type: 'click' },
  { pattern: /图片验证|图形验证/, type: 'image' },
  { pattern: /短信|手机验证/, type: 'sms' },
  { pattern: /邮箱|邮件验证/, type: 'email' },
];

const POPUP_PATTERNS = [
  /cookie/i,
  /隐私政策/i,
  /subscribe/i,
  /订阅/i,
  /年龄验证/i,
  /age.?verify/i,
  /欢迎订阅/i,
  /notification/i,
  /通知/i,
  /modal/i,
  /dialog/i,
  /overlay/i,
  /遮罩/i,
  /弹窗/i,
];

const BLOCK_PATTERNS = [
  /403/i,
  /404/i,
  /access.?denied/i,
  /禁止访问/i,
  /页面不存在/i,
  /not.?found/i,
  /forbidden/i,
  /ip.?blocked/i,
  /ip.?banned/i,
  /机器人验证/i,
  /bot.?detect/i,
  /reject/i,
  /refuse/i,
];

const ERROR_PATTERNS = [
  /网络错误/i,
  /network.?error/i,
  /timeout/i,
  /超时/i,
  /加载失败/i,
  /failed.?load/i,
  /系统错误/i,
  /system.?error/i,
  /500/i,
  /internal.?error/i,
  /error/i,
];

export function analyzePage(analysis: PageAnalysis): DetectionResult {
  const { html, title, elements } = analysis;
  const combined = `${html} ${title}`;

  for (const pattern of CAPTCHA_PATTERNS) {
    if (pattern.test(combined)) {
      return createCaptchaResult(html, elements);
    }
  }

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(combined)) {
      return createBlockResult(html);
    }
  }

  for (const pattern of POPUP_PATTERNS) {
    if (pattern.test(combined)) {
      return createPopupResult(html);
    }
  }

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(combined)) {
      return createErrorResult(html);
    }
  }

  return {
    type: null,
    severity: 'low',
    message: '',
    details: [],
    suggestions: [],
  };
}

function extractCaptchaInfo(
  html: string,
  elements?: PageAnalysis['elements']
): DetectionResult['meta'] {
  const meta: DetectionResult['meta'] = {};

  meta.elementCount = elements?.inputs || countOccurrences(html, /<input/gi);
  meta.images = elements?.images || countOccurrences(html, /<img/gi);

  const captchaIdMatch = html.match(/id=["']?([^"'\s>]+)/gi);
  if (captchaIdMatch) {
    const captchaIds = captchaIdMatch
      .filter((m) => /captcha|verify|验证码/i.test(m))
      .map((m) => m.match(/["']?([^"'\s>]+)/)?.[1])
      .filter(Boolean);
    if (captchaIds.length > 0) {
      meta.captchaId = captchaIds[0];
    }
  }

  const tokenMatch = html.match(/token=["']?([^"'\s>]+)/i);
  if (tokenMatch) {
    meta.captchaId = tokenMatch[1];
  }

  for (const { pattern, type } of CAPTCHA_TYPE_PATTERNS) {
    if (pattern.test(html)) {
      meta.captchaType = type;
      break;
    }
  }

  if (!meta.captchaType) {
    const hasImageInput = /<input[^>]*type=["']?image/i.test(html) || /<img/.test(html);
    const hasSlider = /slider|move|拖动|滑动/.test(html);
    meta.captchaType = hasSlider ? 'slider' : hasImageInput ? 'image' : 'unknown';
  }

  const selectors: string[] = [];
  const imgMatch = html.match(/<img[^>]+src=["'][^"']+["']/gi);
  if (imgMatch) {
    const captchaImgs = imgMatch.filter((m) => /captcha|verify|验证码/i.test(m));
    if (captchaImgs.length > 0) {
      selectors.push(...captchaImgs.slice(0, 3).map((m) => m.substring(0, 100)));
    }
  }

  const inputMatch = html.match(/<input[^>]+>/gi);
  if (inputMatch) {
    const captchaInputs = inputMatch.filter((m) => /captcha|verify|code/i.test(m));
    if (captchaInputs.length > 0) {
      selectors.push(...captchaInputs.slice(0, 3).map((m) => m.substring(0, 100)));
    }
  }

  if (selectors.length > 0) {
    meta.selectors = selectors;
  }

  return meta;
}

function countOccurrences(html: string, regex: RegExp): number {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

function createCaptchaResult(html: string, elements?: PageAnalysis['elements']): DetectionResult {
  const meta = extractCaptchaInfo(html, elements);

  const details: string[] = ['页面包含验证码验证', `验证码类型: ${meta.captchaType || '未知'}`];

  if (meta.captchaId) {
    details.push(`验证码ID: ${meta.captchaId}`);
  }

  if (meta.elementCount) {
    details.push(`检测到 ${meta.elementCount} 个输入框`);
  }

  const suggestions: string[] = [
    `📸 打开实时画面: xcli --session <name> viewer`,
    `🖼️ 验证码类型: ${meta.captchaType || '图片'}`,
  ];

  if (meta.captchaId) {
    suggestions.push(`🔑 验证码ID: ${meta.captchaId}`);
  }

  suggestions.push(`🔗 访问临时链接完成验证`);

  return {
    type: 'captcha',
    severity: 'high',
    message: '检测到验证码拦截',
    details,
    suggestions,
    meta,
  };
}

function createPopupResult(html: string): DetectionResult {
  const details: string[] = ['页面包含弹窗或遮罩层'];

  const popupTypes: string[] = [];
  if (/cookie/i.test(html)) popupTypes.push('Cookie 提示');
  if (/subscribe/i.test(html)) popupTypes.push('订阅弹窗');
  if (/modal|dialog/i.test(html)) popupTypes.push('对话框');
  if (/overlay/i.test(html)) popupTypes.push('遮罩层');

  if (popupTypes.length > 0) {
    details.push(`弹窗类型: ${popupTypes.join(', ')}`);
  }

  return {
    type: 'popup',
    severity: 'medium',
    message: '检测到弹窗拦截',
    details,
    suggestions: [
      '📸 打开实时画面查看: xcli --session <name> viewer',
      '🖱️ 可能需要关闭弹窗后才能继续操作',
      '🔗 或截图发送给 AI 分析',
    ],
  };
}

function createBlockResult(html: string): DetectionResult {
  const details: string[] = ['页面返回 403/404 或被禁止访问'];

  let blockType = '未知';
  if (/403|forbidden/i.test(html)) blockType = '403 Forbidden';
  if (/404|not found/i.test(html)) blockType = '404 Not Found';
  if (/ip.*block/i.test(html)) blockType = 'IP 被封禁';
  if (/bot.*detect/i.test(html)) blockType = '机器人检测';

  details.push(`拦截类型: ${blockType}`);

  return {
    type: 'block',
    severity: 'high',
    message: '检测到访问被拦截',
    details,
    suggestions: ['🔍 检查网络连接', '⏰ 等待一段时间后重试', '📧 联系网站管理员获取权限'],
  };
}

function createErrorResult(html: string): DetectionResult {
  const details: string[] = ['页面加载失败或存在错误'];

  let errorType = '未知';
  if (/timeout/i.test(html)) errorType = '请求超时';
  if (/500|internal error/i.test(html)) errorType = '服务器内部错误';
  if (/network/i.test(html)) errorType = '网络错误';

  details.push(`错误类型: ${errorType}`);

  return {
    type: 'error',
    severity: 'medium',
    message: '检测到页面错误',
    details,
    suggestions: [
      '🔄 重试操作',
      '🌐 检查网络连接',
      '📸 截图查看: xcli --session <name> screenshot',
    ],
  };
}

export function formatTips(result: DetectionResult): string[] {
  if (result.type === null) {
    return [];
  }

  const tips: string[] = [];
  tips.push(`⚠️ ${result.message}`);

  for (const detail of result.details) {
    tips.push(`  • ${detail}`);
  }

  tips.push('');

  for (const suggestion of result.suggestions) {
    tips.push(suggestion);
  }

  return tips;
}

export function shouldRetry(result: DetectionResult): boolean {
  return result.type === 'error' || result.type === 'block';
}

export function canAutoHandle(_result: DetectionResult): boolean {
  return false;
}
