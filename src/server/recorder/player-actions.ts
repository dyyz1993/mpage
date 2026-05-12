import type { RecordedEvent } from './types.js';
import type { PlayerContext } from './player-context.js';
import { waitForAICompletion } from './player-wait.js';

function getKeyInfo(key: string): {
  key: string;
  code: string;
  windowsVirtualKeyCode: number;
  nativeVirtualKeyCode: number;
} {
  const keyMap: Record<
    string,
    { code: string; windowsVirtualKeyCode: number; nativeVirtualKeyCode: number }
  > = {
    Enter: { code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
    Tab: { code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 },
    Escape: { code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 },
    Backspace: { code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 },
    Delete: { code: 'Delete', windowsVirtualKeyCode: 46, nativeVirtualKeyCode: 46 },
    ArrowUp: { code: 'ArrowUp', windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 },
    ArrowDown: { code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 },
    ArrowLeft: { code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 },
    ArrowRight: { code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 },
    Shift: { code: 'ShiftLeft', windowsVirtualKeyCode: 16, nativeVirtualKeyCode: 16 },
    Control: { code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 },
    Alt: { code: 'AltLeft', windowsVirtualKeyCode: 18, nativeVirtualKeyCode: 18 },
    Meta: { code: 'MetaLeft', windowsVirtualKeyCode: 91, nativeVirtualKeyCode: 91 },
  };

  if (keyMap[key]) {
    return { key, ...keyMap[key] };
  }

  if (key.length === 1) {
    const upperKey = key.toUpperCase();
    return {
      key,
      code: `Key${upperKey}`,
      windowsVirtualKeyCode: upperKey.charCodeAt(0),
      nativeVirtualKeyCode: upperKey.charCodeAt(0),
    };
  }

  return { key, code: key, windowsVirtualKeyCode: 0, nativeVirtualKeyCode: 0 };
}

async function sendKeyViaCDP(
  ctx: PlayerContext,
  key: string,
  type: 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char'
): Promise<void> {
  try {
    const cdp = await ctx.getCdpSession();
    const keyInfo = getKeyInfo(key);
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      key: keyInfo.key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.windowsVirtualKeyCode,
      nativeVirtualKeyCode: keyInfo.nativeVirtualKeyCode,
    });
  } catch (e) {
    console.log(`[Playback] CDP key event failed: ${e}`);
  }
}

export async function executeEvent(ctx: PlayerContext, event: RecordedEvent): Promise<void> {
  const data = event.data || {};
  const page = ctx.page;

  switch (event.type) {
    case 'click':
      if (event.selector) {
        if (
          event.selector.includes('message_action') ||
          event.selector.includes('copy') ||
          event.selector.includes('regenerate') ||
          event.selector.includes('share')
        ) {
          console.log('[Playback] Clicking on message action, waiting for message completion...');
          await waitForAICompletion(page);
        }
        await page.click(event.selector);
      }
      break;

    case 'dblclick':
      if (event.selector) {
        await page.dblclick(event.selector);
      }
      break;

    case 'contextmenu':
      if (event.selector) {
        await page.click(event.selector, { button: 'right' });
      }
      break;

    case 'mousedown':
      if (event.selector) {
        await page.hover(event.selector);
      }
      break;

    case 'mouseup':
      break;

    case 'mousemove':
      if (data.points && Array.isArray(data.points)) {
        for (const point of data.points) {
          if (point.x !== undefined && point.y !== undefined) {
            await page.mouse.move(point.x, point.y);
            if (point.delay && point.delay > 0) {
              await page.waitForTimeout(point.delay);
            }
          }
        }
      } else if (data.x !== undefined && data.y !== undefined) {
        await page.mouse.move(data.x, data.y);
      }
      break;

    case 'hover_enter':
      if (event.selector) {
        await page.hover(event.selector);
      }
      break;

    case 'hover_leave':
      await page.mouse.move(0, 0);
      break;

    case 'scroll':
      try {
        await page.evaluate((scrollData) => {
          window.scrollTo(scrollData.scrollX || 0, scrollData.scrollY || 0);
        }, data);
      } catch (e) {
        console.log(`[Playback] Scroll failed (possibly cross-origin frame): ${e}`);
      }
      break;

    case 'keydown':
      if (data.key) {
        await sendKeyViaCDP(ctx, data.key, 'keyDown');
      }
      break;

    case 'keyup':
      if (data.key) {
        await sendKeyViaCDP(ctx, data.key, 'keyUp');
      }
      break;

    case 'input':
      if (event.selector && data.value !== undefined) {
        const currentValue = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? (el as HTMLInputElement).value || el.textContent || '' : '';
        }, event.selector);
        if (data.value.length > currentValue.length) {
          const newChars = data.value.slice(currentValue.length);
          for (const char of newChars) {
            await sendKeyViaCDP(ctx, char, 'char');
          }
        } else if (data.value !== currentValue) {
          await page.fill(event.selector, data.value);
        }
      }
      break;

    case 'change':
      if (event.selector) {
        if (data.value !== undefined) {
          await page.fill(event.selector, data.value);
        } else if (data.checked !== undefined) {
          const element = await page.$(event.selector);
          const isCheckboxOrRadio = element
            ? await element.evaluate((el) => {
                const input = el as HTMLInputElement;
                return input.type === 'checkbox' || input.type === 'radio';
              })
            : false;

          if (isCheckboxOrRadio) {
            if (data.checked) {
              await page.check(event.selector);
            } else {
              await page.uncheck(event.selector);
            }
          }
        }
      }
      break;

    case 'focus':
      if (event.selector) {
        await page.focus(event.selector);
      }
      break;

    case 'blur':
      await page.focus('body');
      break;

    case 'select':
      if (event.selector && data.value !== undefined) {
        await page.selectOption(event.selector, data.value);
      }
      break;

    case 'navigation':
      if (data.url) {
        try {
          await page.goto(data.url, { timeout: 15000 });
        } catch (e) {
          console.log(`[Playback] Navigation timeout for ${data.url}, continuing...`);
        }
      }
      break;

    case 'page_load':
      await page.waitForLoadState('domcontentloaded');
      break;

    case 'hash_change':
      if (data.url) {
        await page.goto(data.url);
      }
      break;

    case 'tab_open':
      if (data.url) {
        console.log(`[Playback] Opening tab: ${data.url}`);
        await page.goto(data.url);
      }
      break;

    case 'file_upload':
      if (event.selector && data.files) {
        await page.setInputFiles(event.selector, data.files);
      }
      break;

    case 'wait':
      break;

    case 'assert':
      break;
  }
}
