export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementInfo {
  tag: string;
  class: string;
  id: string;
  title: string;
  ariaLabel: string;
  role: string;
  text: string;
  innerHTML: string;
  tabIndex: number;
  cursor: string;
  visible: boolean;
  rect: Rect;
}

function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function rectArea(r: Rect): number {
  return r.width * r.height;
}

export function queryByRegion(
  root: Document | Element,
  region: Partial<Rect> & { padding?: number },
  options?: { minSize?: number; maxSize?: number; filter?: (el: ElementInfo) => boolean }
): ElementInfo[] {
  const {
    x = 0,
    y = 0,
    width = Infinity,
    height = Infinity,
    padding = 4,
    minSize = 10,
    maxSize = Infinity,
    filter,
  } = { ...region, ...options };

  const results: ElementInfo[] = [];
  const searchArea: Rect = {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  };

  root.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!rectContains(searchArea, r)) return;
    if (r.width < minSize || r.height < minSize) return;
    if (r.width > maxSize || r.height > maxSize) return;

    const style = window.getComputedStyle(el);
    const info: ElementInfo = {
      tag: el.tagName.toLowerCase(),
      class: (el.className || '').toString().slice(0, 150),
      id: el.id || '',
      title: (el as HTMLElement).title || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      text: (el.textContent || '').trim().slice(0, 100),
      innerHTML: el.innerHTML?.slice(0, 300) || '',
      tabIndex: el.tabIndex,
      cursor: style.cursor || '',
      visible:
        style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      rect: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      },
    };

    if (filter && !filter(info)) return;
    results.push(info);
  });

  results.sort((a, b) => {
    const aArea = rectArea(a.rect);
    const bArea = rectArea(b.rect);
    if (bArea !== aArea) return bArea - aArea;
    return a.rect.y - b.rect.y || a.rect.x - b.rect.x;
  });

  return results;
}

export function findInRegion(
  root: Document | Element,
  region: Partial<Rect> & { padding?: number },
  matcher?: (info: ElementInfo) => boolean
): ElementInfo | null {
  const results = queryByRegion(root, region, { filter: matcher });
  return results[0] ?? null;
}

export function clickRegion(
  page: {
    evaluate: (fn: string) => Promise<unknown>;
    click: (x: number, y: number) => Promise<void>;
  },
  region: Partial<Rect>,
  matcher?: (info: ElementInfo) => boolean
): Promise<ElementInfo | null> {
  const el = (await page.evaluate(
    ({ region: reg, match }) => {
      const { findInRegion } = globalThis as any;
      const info = findInRegion(document, reg, match);
      if (info) {
        const el = document.elementFromPoint(
          info.rect.x + info.rect.width / 2,
          info.rect.y + info.rect.height / 2
        );
        if (el) el.click();
      }
      return info;
    },
    { region, matcher }
  )) as ElementInfo | null;

  return el;
}
