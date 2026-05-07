import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@dyyz1993/xpage', () => ({
  executePageCommand: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@dyyz1993/xcli-core', () => ({
  ok: (data: unknown) => data,
}));

import {
  getAllCommands,
  getCommand,
  getCommandNames,
  clearRegistry,
  registerCommand,
} from '../../src/commands/index.js';
import type { RegisteredCommand } from '../../src/commands/command-registry.js';

const TOTAL_COMMANDS = 33;

const ELEMENT_SCOPE_COMMANDS = [
  'click',
  'fill',
  'type',
  'select',
  'check',
  'hover',
  'dblclick',
  'getProperty',
];
const PAGE_SCOPE_COMMANDS = [
  'goto',
  'refresh',
  'back',
  'forward',
  'press',
  'html',
  'screenshot',
  'text',
  'title',
  'url',
  'waitForSelector',
  'waitForTimeout',
  'scroll',
  'mouse',
  'eval',
  'evaluate',
  'getCookies',
  'setCookie',
  'clearCookies',
  'getLocalStorage',
  'setLocalStorage',
  'clearLocalStorage',
  'structure',
  'snapshot',
];
const BROWSER_SCOPE_COMMANDS = ['setViewport'];

describe('Command Registry', () => {
  let commands: RegisteredCommand[];

  beforeAll(() => {
    commands = getAllCommands();
  });

  it(`should register ${TOTAL_COMMANDS} commands`, () => {
    expect(commands).toHaveLength(TOTAL_COMMANDS);
  });

  it('every command should have a name', () => {
    for (const cmd of commands) {
      expect(cmd.name).toBeTruthy();
      expect(typeof cmd.name).toBe('string');
    }
  });

  it('every command should have a description', () => {
    for (const cmd of commands) {
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.description).toBe('string');
    }
  });

  it('every command should have a valid scope', () => {
    const validScopes = ['project', 'browser', 'page', 'element'];
    for (const cmd of commands) {
      expect(validScopes).toContain(cmd.scope);
    }
  });

  it('every command should have a handler function', () => {
    for (const cmd of commands) {
      expect(typeof cmd.handler).toBe('function');
    }
  });

  it('command names should be unique', () => {
    const names = commands.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should get command by name', () => {
    const goto = getCommand('goto');
    expect(goto).toBeDefined();
    expect(goto?.name).toBe('goto');
    expect(goto?.scope).toBe('page');
  });

  it('should get all command names', () => {
    const names = getCommandNames();
    expect(names).toHaveLength(TOTAL_COMMANDS);
    expect(names).toContain('goto');
    expect(names).toContain('click');
    expect(names).toContain('fill');
  });

  it('should return undefined for nonexistent command', () => {
    expect(getCommand('nonexistent')).toBeUndefined();
  });

  it('page scope commands should be the majority', () => {
    const pageCommands = commands.filter((c) => c.scope === 'page');
    const elementCommands = commands.filter((c) => c.scope === 'element');
    expect(pageCommands.length).toBeGreaterThan(10);
    expect(elementCommands.length).toBeGreaterThanOrEqual(8);
  });

  it('should have correct element-scoped commands', () => {
    for (const name of ELEMENT_SCOPE_COMMANDS) {
      const cmd = getCommand(name);
      expect(cmd, `Command "${name}" should exist`).toBeDefined();
      expect(cmd?.scope, `Command "${name}" should be element-scoped`).toBe('element');
    }
  });

  it('should have correct browser-scoped commands', () => {
    for (const name of BROWSER_SCOPE_COMMANDS) {
      const cmd = getCommand(name);
      expect(cmd, `Command "${name}" should exist`).toBeDefined();
      expect(cmd?.scope, `Command "${name}" should be browser-scoped`).toBe('browser');
    }
  });

  it('should have correct page-scoped commands', () => {
    for (const name of PAGE_SCOPE_COMMANDS) {
      const cmd = getCommand(name);
      expect(cmd, `Command "${name}" should exist`).toBeDefined();
      expect(cmd?.scope, `Command "${name}" should be page-scoped`).toBe('page');
    }
  });

  it('should have storage commands with page scope', () => {
    for (const name of [
      'getCookies',
      'setCookie',
      'clearCookies',
      'getLocalStorage',
      'setLocalStorage',
      'clearLocalStorage',
    ]) {
      const cmd = getCommand(name);
      expect(cmd).toBeDefined();
      expect(cmd?.scope).toBe('page');
    }
  });

  it('commands with parameters should have Zod schema', () => {
    const commandsWithParams = commands.filter((c) => c.parameters);
    expect(commandsWithParams.length).toBeGreaterThan(10);
  });

  it('should support clearRegistry', () => {
    const savedCommands = [...commands];
    clearRegistry();
    expect(getAllCommands()).toHaveLength(0);
    for (const cmd of savedCommands) {
      registerCommand(cmd);
    }
    expect(getAllCommands()).toHaveLength(TOTAL_COMMANDS);
  });

  it('snapshot should have parameters defined', () => {
    const snapshot = getCommand('snapshot');
    expect(snapshot).toBeDefined();
    expect(snapshot?.parameters).toBeDefined();
  });

  it('scroll should have page scope', () => {
    const scroll = getCommand('scroll');
    expect(scroll).toBeDefined();
    expect(scroll?.scope).toBe('page');
  });

  it('mouse should have page scope', () => {
    const mouse = getCommand('mouse');
    expect(mouse).toBeDefined();
    expect(mouse?.scope).toBe('page');
  });

  it('press should have page scope', () => {
    const press = getCommand('press');
    expect(press).toBeDefined();
    expect(press?.scope).toBe('page');
  });

  it('setViewport should have browser scope', () => {
    const sv = getCommand('setViewport');
    expect(sv).toBeDefined();
    expect(sv?.scope).toBe('browser');
  });
});
