import { BrowserWorker } from './daemon/browser-worker.js';
export { BrowserWorker } from './daemon/browser-worker.js';

export type { CapturedRequest, CapturedResponse, NetworkCapture } from './types.js';

export type { BrowserCommandContext } from './context.js';
export { checkBrowserScope } from './context.js';

export { BROWSER_SCOPE } from './scope.js';

export {
  daemonRequest,
  requireSession,
  openSession,
  closeSession,
  closeAllSessions,
  listSessions,
  htmlSession,
  screenshotSession,
  snapshotSession,
  gotoSession,
  refreshSession,
  navigateSession,
  clickSession,
  fillSession,
  typeSession,
  pressSession,
  selectSession,
  checkSession,
  scrollSession,
  mouseSession,
  evalScriptSession,
  getCookies,
  setCookie,
  clearCookies,
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage,
  waitForSelector,
  waitForTimeout,
  getElementSession,
  getSession,
  saveSession,
} from './session/browser-session-client.js';
export type { SnapshotElement } from './session/browser-session-client.js';

export { BrowserWorker as default };

export { allBuiltins, getBuiltin } from './builtins/index.js';
export type { BuiltinCommand, BuiltinContext, PluginMeta } from './builtins/index.js';

export {
  registerCommand,
  getAllCommands,
  getCommand,
  getCommandNames,
  clearRegistry,
} from './commands/index.js';
export type { BrowserCommandDefinition } from './commands/index.js';

export {
  gotoCommand,
  refreshCommand,
  backCommand,
  forwardCommand,
  clickCommand,
  fillCommand,
  typeCommand,
  pressCommand,
  selectCommand,
  checkCommand,
  hoverCommand,
  dblclickCommand,
  htmlCommand,
  screenshotCommand,
  textCommand,
  titleCommand,
  urlCommand,
  getPropertyCommand,
  waitForSelectorCommand,
  waitForTimeoutCommand,
  scrollCommand,
  mouseCommand,
  evalCommand,
  evaluateCommand,
  getCookiesCommand,
  setCookieCommand,
  clearCookiesCommand,
  getLocalStorageCommand,
  setLocalStorageCommand,
  clearLocalStorageCommand,
  structureCommand,
  snapshotCommand,
  setViewportCommand,
} from './commands/index.js';
