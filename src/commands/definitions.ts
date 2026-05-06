import { z } from 'zod';
import type { CommandDefinition } from '../types.js';

export const commands: Record<string, CommandDefinition> = {
  goto: {
    schema: z.object({
      url: z.string(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
      timeout: z.number().optional(),
    }),
    description: 'Navigate to URL',
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
  },
  press: {
    schema: z.object({
      key: z.string(),
      selector: z.string().optional(),
      delay: z.number().optional(),
    }),
    description: 'Press key on element (defaults to focused element)',
  },
  hover: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
      modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
    }),
    description: 'Hover element',
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
  },
  check: {
    schema: z.object({
      selector: z.string(),
      checked: z.boolean().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Check/uncheck checkbox',
  },
  waitForSelector: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
      state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
    }),
    description: 'Wait for element to appear in DOM',
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
  },
  getProperty: {
    schema: z.object({
      selector: z.string().optional(),
      property: z.string(),
    }),
    description: 'Get element property value',
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
  },
  getCookies: {
    schema: z.object({}),
    description: 'Get all cookies',
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
  },
  clearCookies: {
    schema: z.object({}),
    description: 'Clear all cookies',
  },
  getLocalStorage: {
    schema: z.object({}),
    description: 'Get all localStorage entries',
  },
  setLocalStorage: {
    schema: z.object({
      key: z.string(),
      value: z.string(),
    }),
    description: 'Set a localStorage entry',
  },
  clearLocalStorage: {
    schema: z.object({}),
    description: 'Clear all localStorage entries',
  },
  waitForTimeout: {
    schema: z.object({ timeout: z.number() }),
    description: 'Wait for timeout',
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
  },
  url: {
    schema: z.object({}),
    description: 'Get current URL',
  },
  html: {
    schema: z.object({
      selector: z.string().optional(),
      clean: z.boolean().optional(),
      full: z.boolean().optional(),
    }),
    description: 'Get HTML content (use --clean true to remove Vue attrs and empty elements)',
  },
  text: {
    schema: z.object({ selector: z.string().optional() }),
    description: 'Get text content',
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
