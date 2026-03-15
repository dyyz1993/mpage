import { z } from 'zod';
import type { CommandDefinition } from '../types.js';

export const commands: Record<string, CommandDefinition> = {
  goto: {
    schema: z.object({
      url: z.string(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
      timeout: z.number().optional(),
    }),
    description: 'Navigate to URL',
  },
  click: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
      force: z.boolean().optional(),
    }),
    description: 'Click element',
  },
  fill: {
    schema: z.object({
      selector: z.string(),
      value: z.string(),
      timeout: z.number().optional(),
    }),
    description: 'Fill input',
  },
  type: {
    schema: z.object({
      selector: z.string(),
      text: z.string(),
      delay: z.number().optional(),
    }),
    description: 'Type text',
  },
  press: {
    schema: z.object({
      selector: z.string(),
      key: z.string(),
      delay: z.number().optional(),
    }),
    description: 'Press key',
  },
  hover: {
    schema: z.object({
      selector: z.string(),
      timeout: z.number().optional(),
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
  waitForTimeout: {
    schema: z.object({ timeout: z.number() }),
    description: 'Wait for timeout',
  },
  screenshot: {
    schema: z.object({
      path: z.string().optional(),
      fullPage: z.boolean().optional(),
    }),
    description: 'Take screenshot',
  },
  evaluate: {
    schema: z.object({ expression: z.string() }),
    description: 'Evaluate JavaScript',
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
    schema: z.object({ timeout: z.number() }),
    description: 'Wait for specified milliseconds',
  },
  structure: {
    schema: z.object({
      selector: z.string().optional(),
      maxDepth: z.number().optional(),
    }),
    description: 'Get page structure layout with selectors and array detection',
  },
};

export function getCommandNames(): string[] {
  return Object.keys(commands);
}
