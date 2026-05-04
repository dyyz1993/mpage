export { analyzePage, formatTips, shouldRetry, canAutoHandle } from './page-hook.js';
export type { DetectionResult, PageAnalysis } from './page-hook.js';

export { createTrackedPage } from './page-proxy.js';
export type { PageProxyOptions } from './page-proxy.js';

export { executeBuiltin, getBuiltinScope } from './execute-builtin.js';

export { executeSiteCommand, checkScope } from './execute-site.js';
export type { CapturedResponse, CapturedRequest, NetworkCapture } from './execute-site.js';

export { allBuiltins, getBuiltin } from './builtins/index.js';
export type { BuiltinCommand, BuiltinContext } from './builtins/index.js';

export * from './commands/index.js';
