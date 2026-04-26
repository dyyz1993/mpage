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

import type { Cookie } from 'playwright';

export async function handleRPCCommandAsync(
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const p = params ?? ({} as Record<string, unknown>);
  switch (method) {
    case 'session.open':
      return await createSession(p.name as string, p.url as string);
    case 'session.close':
      await closeSession(p.name as string);
      return { ok: true };
    case 'session.closeAll':
      await closeAll();
      return { ok: true };
    case 'session.list':
      return { sessions: listSessions() };
    case 'session.kill':
      killSession(p.name as string);
      return { ok: true };
    case 'storage.get':
      return getStorage(p.name as string, p.type as string);
    case 'storage.set':
      setStorage(
        p.name as string,
        p.type as string,
        p.key as string,
        p.value as string,
        p.data as Cookie | undefined
      );
      return { ok: true };
    case 'storage.clear':
      clearStorage(p.name as string, p.type as string);
      return { ok: true };
    case 'page.html':
      return await getPageHtml(p.name as string);
    case 'page.screenshot':
      return await getPageScreenshot(p.name as string);
    case 'page.snapshot':
      return await getPageSnapshot(p.name as string, (p.interactiveOnly as boolean) || false);
    case 'page.mouse':
      return await handlePageMouse(
        p.name as string,
        p.action as string,
        p.x as number,
        p.y as number,
        p.steps as number
      );
    case 'page.click':
      return await handlePageClick(p.name as string, p.selector as string);
    case 'page.select':
      return await handlePageSelect(p.name as string, p.selector as string, p.value as string);
    case 'page.check':
      return await handlePageCheck(p.name as string, p.selector as string);
    case 'page.press':
      return await handlePagePress(p.name as string, p.key as string, p.selector as string);
    case 'page.get':
      return await handlePageGet(p.name as string, p.property as string, p.selector as string);
    case 'page.type':
      return await handlePageType(p.name as string, p.selector as string, p.text as string);
    case 'page.fill':
      return await handlePageFill(p.name as string, p.selector as string, p.text as string);
    case 'page.scroll':
      return await handlePageScroll(p.name as string, p.direction as string, p.distance as number);
    case 'page.eval':
      return await handlePageEval(p.name as string, p.script as string);
    case 'page.waitForSelector':
      return await handlePageWaitForSelector(
        p.name as string,
        p.selector as string,
        p.timeout as number
      );
    case 'page.waitForTimeout':
      return await handlePageWaitForTimeout(p.name as string, p.timeout as number);
    case 'page.goto':
      return await handlePageGoto(p.name as string, p.url as string);
    case 'page.navigate':
      return await handlePageNavigate(p.name as string, p.direction as string);
    case 'page.refresh':
      return await handlePageRefresh(p.name as string);
    case 'page.verifySlider':
      return await handlePageVerifySlider(p.name as string, p.baseUrl as string);
    case 'page.http':
      return await handlePageFetch(
        p.name as string,
        p.method as string,
        p.url as string,
        p.body as Record<string, unknown> | undefined,
        p.headers as Record<string, string> | undefined
      );
    case 'page.fetch':
      return await handlePageFetch(
        p.name as string,
        p.method as string,
        p.url as string,
        p.body as Record<string, unknown> | undefined,
        p.headers as Record<string, string> | undefined
      );
    case 'page.addCookie':
      return await handlePageAddCookie(p.name as string, p.cookie as Cookie);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
