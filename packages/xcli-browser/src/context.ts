import type { CommandContext, CommandScope } from '@dyyz1993/xcli-core';
import type { Page, Browser, BrowserContext } from 'playwright';
import type { RecorderController } from '@dyyz1993/xpage';

export interface BrowserCommandContext extends CommandContext {
  page: Page;
  browser: Browser;
  browserContext: BrowserContext;
  recorder?: RecorderController;
}

export function checkBrowserScope(scope: CommandScope, ctx: BrowserCommandContext): string | null {
  switch (scope) {
    case 'project':
      return null;
    case 'browser':
      return ctx.page ? null : '需要浏览器实例，请先执行 xcli open <url>';
    case 'page':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
    case 'element':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
  }
}
