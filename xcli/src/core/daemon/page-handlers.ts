import { findSession } from './session-store';

export async function handlePageMouse(
  name: string,
  action: string,
  x: number,
  y: number,
  steps?: number
) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };

  if (action === 'move') {
    await session.page.mouse.move(x, y, { steps: steps || 1 });
  } else if (action === 'down') {
    await session.page.mouse.down();
  } else if (action === 'up') {
    await session.page.mouse.up();
  } else if (action === 'click') {
    await session.page.mouse.click(x, y);
  }
  return { ok: true, action, x, y };
}

export async function handlePageClick(name: string, selector: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.click(selector);
  return { ok: true, selector };
}

export async function handlePageSelect(name: string, selector: string, value: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.selectOption(selector, value);
  return { ok: true, selector, value };
}

export async function handlePageCheck(name: string, selector: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.check(selector);
  return { ok: true, selector };
}

export async function handlePagePress(name: string, key: string, selector?: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  if (selector) {
    await session.page.press(selector, key);
  } else {
    await session.page.keyboard.press(key);
  }
  return { ok: true, key, selector };
}

export async function handlePageGet(name: string, property: string, selector?: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };

  let value = '';
  if (property === 'url') {
    value = session.page.url();
  } else if (property === 'title') {
    value = await session.page.title();
  } else if (property === 'text' && selector) {
    value = (await session.page.locator(selector).textContent()) || '';
  } else if (property === 'value' && selector) {
    value = (await session.page.locator(selector).inputValue()) || '';
  } else if (selector) {
    value = (await session.page.locator(selector).textContent()) || '';
  }
  return { ok: true, property, selector, value };
}

export async function handlePageType(name: string, selector: string, text: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.type(selector, text);
  return { ok: true, selector, text };
}

export async function handlePageFill(name: string, selector: string, text: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.fill(selector, text);
  return { ok: true, selector, text };
}

export async function handlePageScroll(name: string, direction: string, distance: number) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  const scrollAmount = direction === 'up' ? -distance : distance;
  await session.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
  return { ok: true, direction, distance };
}

export async function handlePageEval(name: string, script: string) {
  const session = findSession(name);
  if (!session) return { error: 'Session not found' };
  try {
    const result = await session.page.evaluate(`(async () => { return ${script}; })()`);
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handlePageWaitForSelector(name: string, selector: string, timeout: number) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.waitForSelector(selector, { timeout });
  return { ok: true, selector };
}

export async function handlePageWaitForTimeout(name: string, timeout: number) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.waitForTimeout(timeout);
  return { ok: true, timeout };
}

export async function handlePageGoto(name: string, url: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.goto(url);
  return { ok: true, url };
}

export async function handlePageNavigate(name: string, direction: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  if (direction === 'back') {
    await session.page.goBack();
  } else if (direction === 'forward') {
    await session.page.goForward();
  }
  return { ok: true, direction };
}

export async function handlePageRefresh(name: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.page.reload();
  return { ok: true };
}
