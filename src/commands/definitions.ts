import { z } from 'zod/v4';
import type { CommandDefinition } from '../types.js';

export const commands: Record<string, CommandDefinition> = {
  goto: {
    schema: z.object({
      url: z.string(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
      timeout: z.number().optional(),
    }),
    description: 'Navigate to URL',
    cliMeta: {
      scope: 'page',
      describe: { url: 'URL to navigate to', waitUntil: 'Wait condition' },
      defaults: { waitUntil: 'domcontentloaded' },
    },
  },
  click: {
    schema: z.object({
      selector: z.string(),
      button: z.enum(['left', 'right', 'middle']).optional(),
      clickCount: z.number().optional(),
      delay: z.number().optional(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Click element',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Element selector',
        button: 'Mouse button',
        clickCount: 'Number of clicks',
        delay: 'Delay between mousedown and mouseup (ms)',
        force: 'Skip actionability checks',
      },
      defaults: { button: 'left', clickCount: 1, delay: 0, force: false },
    },
  },
  dblclick: {
    schema: z.object({
      selector: z.string(),
      button: z.enum(['left', 'right', 'middle']).optional(),
      delay: z.number().optional(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Double-click element',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Element selector',
        button: 'Mouse button',
        delay: 'Delay between clicks (ms)',
        force: 'Skip actionability checks',
      },
      defaults: { button: 'left', delay: 0, force: false },
    },
  },
  fill: {
    schema: z.object({
      selector: z.string(),
      value: z.string(),
      clear: z.boolean().optional(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Fill input',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Element selector',
        value: 'Value to fill',
        clear: 'Clear field before filling',
        force: 'Skip actionability checks',
      },
      defaults: { clear: true, force: false },
    },
  },
  type: {
    schema: z.object({
      selector: z.string(),
      text: z.string(),
      delay: z.number().optional(),
      clear: z.boolean().optional(),
      timeout: z.number().optional(),
    }),
    description: 'Type text',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Element selector',
        text: 'Text to type',
        delay: 'Delay between keystrokes (ms)',
        clear: 'Clear field before typing',
      },
      defaults: { delay: 50, clear: false },
    },
  },
  press: {
    schema: z.object({
      key: z.string(),
      selector: z.string().optional(),
      delay: z.number().optional(),
    }),
    description: 'Press key on element (defaults to focused element)',
    cliMeta: {
      scope: 'page',
      describe: {
        key: 'Key to press (e.g., Enter, Escape, Tab, ArrowDown)',
        selector: 'Element selector (focuses element first)',
        delay: 'Delay after key press (ms)',
      },
      defaults: { delay: 0 },
    },
  },
  hover: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
      modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
    }),
    description: 'Hover element',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Element selector',
        force: 'Skip actionability checks',
        modifiers: 'Modifier keys to hold',
      },
      defaults: { force: false, modifiers: [] },
    },
  },
  scroll: {
    schema: z.object({
      selector: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    description: 'Scroll page',
  },
  select: {
    schema: z.object({
      selector: z.string(),
      value: z.string(),
    }),
    description: 'Select dropdown option',
    cliMeta: {
      scope: 'element',
      describe: { selector: 'Select element selector', value: 'Value(s) to select' },
    },
  },
  check: {
    schema: z.object({
      selector: z.string(),
      checked: z.boolean().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Check/uncheck checkbox',
    cliMeta: {
      scope: 'element',
      describe: {
        selector: 'Checkbox or radio selector',
        checked: 'Check or uncheck',
        force: 'Skip actionability checks',
      },
      defaults: { checked: true, force: false },
    },
  },
  waitForSelector: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
      state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
    }),
    description: 'Wait for element to appear in DOM',
    cliMeta: {
      scope: 'page',
      describe: {
        selector: 'Selector to wait for',
        state: 'Element state to wait for',
        timeout: 'Maximum wait time (ms)',
      },
      defaults: { state: 'visible', timeout: 30000 },
    },
  },
  mouse: {
    schema: z.object({
      action: z.enum(['move', 'down', 'up', 'click', 'dblclick']),
      x: z.number().optional(),
      y: z.number().optional(),
      button: z.enum(['left', 'right', 'middle']).optional(),
      steps: z.number().optional(),
    }),
    description: 'Low-level mouse control',
    cliMeta: {
      scope: 'page',
      describe: {
        action: 'Mouse action',
        x: 'X coordinate',
        y: 'Y coordinate',
        button: 'Mouse button',
        steps: 'Steps for move action',
      },
      defaults: { x: 0, y: 0, button: 'left', steps: 1 },
    },
  },
  getProperty: {
    schema: z.object({
      selector: z.string().optional(),
      property: z.string(),
    }),
    description: 'Get element property value',
    cliMeta: {
      scope: 'element',
      describe: { selector: 'Element selector', property: 'Property to get' },
    },
  },
  setViewport: {
    schema: z.object({
      width: z.number().optional(),
      height: z.number().optional(),
      deviceScaleFactor: z.number().optional(),
      isMobile: z.boolean().optional(),
      hasTouch: z.boolean().optional(),
    }),
    description: 'Set viewport size',
    cliMeta: {
      scope: 'browser',
      describe: {
        width: 'Viewport width',
        height: 'Viewport height',
        deviceScaleFactor: 'Device scale factor',
        isMobile: 'Mobile viewport',
        hasTouch: 'Touch support',
      },
      defaults: { isMobile: false, hasTouch: false },
      paramFilter: ['width', 'height'],
    },
  },
  getCookies: {
    schema: z.object({}),
    description: 'Get all cookies',
    cliMeta: { scope: 'page' },
  },
  setCookie: {
    schema: z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      expires: z.number().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
    }),
    description: 'Set a cookie',
    cliMeta: {
      scope: 'page',
      describe: {
        name: 'Cookie name',
        value: 'Cookie value',
        domain: 'Cookie domain',
        path: 'Cookie path',
        expires: 'Expiry timestamp',
        httpOnly: 'HTTP only',
        secure: 'Secure only',
        sameSite: 'SameSite policy',
      },
      defaults: { path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    },
  },
  clearCookies: {
    schema: z.object({}),
    description: 'Clear all cookies',
    cliMeta: { scope: 'page' },
  },
  getLocalStorage: {
    schema: z.object({}),
    description: 'Get all localStorage entries',
    cliMeta: { scope: 'page' },
  },
  setLocalStorage: {
    schema: z.object({
      key: z.string(),
      value: z.string(),
    }),
    description: 'Set a localStorage entry',
    cliMeta: {
      scope: 'page',
      describe: { key: 'Storage key', value: 'Storage value' },
    },
  },
  clearLocalStorage: {
    schema: z.object({}),
    description: 'Clear all localStorage entries',
    cliMeta: { scope: 'page' },
  },
  waitForTimeout: {
    schema: z.object({ timeout: z.number() }),
    description: 'Wait for timeout',
    cliMeta: {
      scope: 'page',
      describe: { timeout: 'Wait time in milliseconds' },
      defaults: { timeout: 1000 },
      xpageCommand: 'wait',
    },
  },
  screenshot: {
    schema: z.object({
      path: z.string().optional(),
      fullPage: z.boolean().optional(),
      type: z.enum(['png', 'jpeg']).optional(),
      quality: z.number().optional(),
      selector: z.string().optional(),
    }),
    description: 'Take screenshot',
  },
  evaluate: {
    schema: z.object({ expression: z.string() }),
    description: 'Evaluate JavaScript',
  },
  evaluateRaw: {
    schema: z.object({ script: z.string() }),
    description: 'Evaluate raw async JavaScript',
  },
  title: {
    schema: z.object({}),
    description: 'Get page title',
    cliMeta: { scope: 'page' },
  },
  url: {
    schema: z.object({}),
    description: 'Get current URL',
    cliMeta: { scope: 'page' },
  },
  html: {
    schema: z.object({
      selector: z.string().optional(),
      clean: z.boolean().optional(),
      full: z.boolean().optional(),
    }),
    description: 'Get HTML content (use --clean true to remove Vue attrs and empty elements)',
    cliMeta: {
      scope: 'page',
      describe: {
        selector: 'Element selector (defaults to body)',
        clean: 'Remove Vue attrs and empty elements',
        full: 'Return full page HTML',
      },
      defaults: { clean: false, full: false },
      paramFilter: ['selector', 'clean'],
    },
  },
  text: {
    schema: z.object({ selector: z.string().optional() }),
    description: 'Get text content',
    cliMeta: {
      scope: 'page',
      describe: { selector: 'Element selector' },
    },
  },
  a11y: {
    schema: z.object({
      selector: z.string().optional(),
      format: z.enum(['yaml', 'json']).optional(),
    }),
    description: 'Get accessibility tree (default: yaml format)',
  },
  snapshot: {
    schema: z.object({ selector: z.string().optional() }),
    description: 'Get ARIA snapshot as YAML string (Playwright native, AI-friendly)',
  },
  query: {
    schema: z.object({ selector: z.string() }),
    description: 'Query elements by selector',
  },
  find: {
    schema: z.object({
      text: z.string(),
      tag: z.string().optional(),
      exact: z.boolean().optional(),
    }),
    description: 'Find elements by text',
  },
  wait: {
    schema: z.object({
      state: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
      timeout: z.number().optional(),
    }),
    description: 'Wait for load state or specified milliseconds',
  },
  structure: {
    schema: z.object({
      selector: z.string().optional(),
      maxDepth: z.number().optional(),
    }),
    description: 'Get page structure layout with selectors and array detection',
    cliMeta: {
      scope: 'page',
      describe: {
        selector: 'Root selector to analyze',
        maxDepth: 'Maximum depth of structure tree',
      },
      defaults: { selector: 'body', maxDepth: 5 },
      paramFilter: ['selector'],
    },
  },
  frames: {
    schema: z.object({}),
    description: 'List all frames (iframes) on the page',
  },
  frame: {
    schema: z.object({
      index: z.number().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
      reset: z.boolean().optional(),
    }),
    description:
      'Switch to a frame by index, name, or URL pattern. Use --reset true to switch back to main frame',
  },
};

export function getCommandNames(): string[] {
  return Object.keys(commands);
}
