import { createSession, closeSession, closeAll, listSessions, killSession } from './session-store';
import {
  getStorage,
  setStorage,
  clearStorage,
  getPageHtml,
  getPageScreenshot,
  getPageSnapshot,
} from './storage-handlers';
import {
  handlePageMouse,
  handlePageClick,
  handlePageSelect,
  handlePageCheck,
  handlePagePress,
  handlePageGet,
  handlePageType,
  handlePageFill,
  handlePageScroll,
  handlePageEval,
  handlePageWaitForSelector,
  handlePageWaitForTimeout,
  handlePageGoto,
  handlePageNavigate,
  handlePageRefresh,
} from './page-handlers';
import {
  handlePageVerifySlider,
  handlePageFetch,
  handlePageAddCookie,
} from './page-action-handlers';

export async function handleRPCCommandAsync(method: string, params?: any): Promise<any> {
  switch (method) {
    case 'session.open':
      return await createSession(params.name, params.url);
    case 'session.close':
      await closeSession(params.name);
      return { ok: true };
    case 'session.closeAll':
      await closeAll();
      return { ok: true };
    case 'session.list':
      return { sessions: listSessions() };
    case 'session.kill':
      killSession(params.name);
      return { ok: true };
    case 'storage.get':
      return getStorage(params.name, params.type);
    case 'storage.set':
      setStorage(params.name, params.type, params.key, params.value, params.data);
      return { ok: true };
    case 'storage.clear':
      clearStorage(params.name, params.type);
      return { ok: true };
    case 'page.html':
      return await getPageHtml(params.name);
    case 'page.screenshot':
      return await getPageScreenshot(params.name);
    case 'page.snapshot':
      return await getPageSnapshot(params.name, params.interactiveOnly || false);
    case 'page.mouse':
      return await handlePageMouse(params.name, params.action, params.x, params.y, params.steps);
    case 'page.click':
      return await handlePageClick(params.name, params.selector);
    case 'page.select':
      return await handlePageSelect(params.name, params.selector, params.value);
    case 'page.check':
      return await handlePageCheck(params.name, params.selector);
    case 'page.press':
      return await handlePagePress(params.name, params.key, params.selector);
    case 'page.get':
      return await handlePageGet(params.name, params.property, params.selector);
    case 'page.type':
      return await handlePageType(params.name, params.selector, params.text);
    case 'page.fill':
      return await handlePageFill(params.name, params.selector, params.text);
    case 'page.scroll':
      return await handlePageScroll(params.name, params.direction, params.distance);
    case 'page.eval':
      return await handlePageEval(params.name, params.script);
    case 'page.waitForSelector':
      return await handlePageWaitForSelector(params.name, params.selector, params.timeout);
    case 'page.waitForTimeout':
      return await handlePageWaitForTimeout(params.name, params.timeout);
    case 'page.goto':
      return await handlePageGoto(params.name, params.url);
    case 'page.navigate':
      return await handlePageNavigate(params.name, params.direction);
    case 'page.refresh':
      return await handlePageRefresh(params.name);
    case 'page.verifySlider':
      return await handlePageVerifySlider(params.name, params.baseUrl);
    case 'page.http':
      return await handlePageFetch(
        params.name,
        params.method,
        params.url,
        params.body,
        params.headers
      );
    case 'page.fetch':
      return await handlePageFetch(
        params.name,
        params.method,
        params.url,
        params.body,
        params.headers
      );
    case 'page.addCookie':
      return await handlePageAddCookie(params.name, params.cookie);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
