import { registerCommand } from './command-registry.js';
import type { RegisteredCommand } from './command-registry.js';
export {
  registerCommand,
  getAllCommands,
  getCommand,
  getCommandNames,
  clearRegistry,
} from './command-registry.js';
export type { BrowserCommandDefinition, RegisteredCommand } from './command-registry.js';
export { createCliCommand, createCliCommands } from './command-factory.js';

import { createCliCommands } from './command-factory.js';

const factoryCommands = createCliCommands([
  'goto',
  'click',
  'dblclick',
  'fill',
  'type',
  'press',
  'hover',
  'select',
  'check',
  'waitForSelector',
  'waitForTimeout',
  'mouse',
  'getProperty',
  'setViewport',
  'getCookies',
  'setCookie',
  'clearCookies',
  'getLocalStorage',
  'setLocalStorage',
  'clearLocalStorage',
  'title',
  'url',
  'html',
  'text',
  'structure',
]);

import { scrollCommand } from './scroll.js';
import { evalCommand } from './eval.js';
import { evaluateCommand } from './evaluate.js';
import { screenshotCommand } from './screenshot.js';
import { snapshotCommand } from './snapshot.js';
import { refreshCommand } from './refresh.js';
import { backCommand } from './back.js';
import { forwardCommand } from './forward.js';

const specialCommands: RegisteredCommand[] = [
  scrollCommand,
  evalCommand,
  evaluateCommand,
  screenshotCommand,
  snapshotCommand,
  refreshCommand,
  backCommand,
  forwardCommand,
];

const gotoCommand = factoryCommands.find((c) => c.name === 'goto')!;
const clickCommand = factoryCommands.find((c) => c.name === 'click')!;
const fillCommand = factoryCommands.find((c) => c.name === 'fill')!;
const typeCommand = factoryCommands.find((c) => c.name === 'type')!;
const pressCommand = factoryCommands.find((c) => c.name === 'press')!;
const selectCommand = factoryCommands.find((c) => c.name === 'select')!;
const checkCommand = factoryCommands.find((c) => c.name === 'check')!;
const hoverCommand = factoryCommands.find((c) => c.name === 'hover')!;
const dblclickCommand = factoryCommands.find((c) => c.name === 'dblclick')!;
const htmlCommand = factoryCommands.find((c) => c.name === 'html')!;
const textCommand = factoryCommands.find((c) => c.name === 'text')!;
const titleCommand = factoryCommands.find((c) => c.name === 'title')!;
const urlCommand = factoryCommands.find((c) => c.name === 'url')!;
const getPropertyCommand = factoryCommands.find((c) => c.name === 'getProperty')!;
const waitForSelectorCommand = factoryCommands.find((c) => c.name === 'waitForSelector')!;
const waitForTimeoutCommand = factoryCommands.find((c) => c.name === 'waitForTimeout')!;
const mouseCommand = factoryCommands.find((c) => c.name === 'mouse')!;
const getCookiesCommand = factoryCommands.find((c) => c.name === 'getCookies')!;
const setCookieCommand = factoryCommands.find((c) => c.name === 'setCookie')!;
const clearCookiesCommand = factoryCommands.find((c) => c.name === 'clearCookies')!;
const getLocalStorageCommand = factoryCommands.find((c) => c.name === 'getLocalStorage')!;
const setLocalStorageCommand = factoryCommands.find((c) => c.name === 'setLocalStorage')!;
const clearLocalStorageCommand = factoryCommands.find((c) => c.name === 'clearLocalStorage')!;
const structureCommand = factoryCommands.find((c) => c.name === 'structure')!;
const setViewportCommand = factoryCommands.find((c) => c.name === 'setViewport')!;

export {
  gotoCommand,
  clickCommand,
  fillCommand,
  typeCommand,
  pressCommand,
  selectCommand,
  checkCommand,
  hoverCommand,
  dblclickCommand,
  htmlCommand,
  screenshotCommand,
  textCommand,
  titleCommand,
  urlCommand,
  getPropertyCommand,
  waitForSelectorCommand,
  waitForTimeoutCommand,
  scrollCommand,
  mouseCommand,
  evalCommand,
  evaluateCommand,
  getCookiesCommand,
  setCookieCommand,
  clearCookiesCommand,
  getLocalStorageCommand,
  setLocalStorageCommand,
  clearLocalStorageCommand,
  structureCommand,
  snapshotCommand,
  setViewportCommand,
  refreshCommand,
  backCommand,
  forwardCommand,
};

const allCommands: RegisteredCommand[] = [...factoryCommands, ...specialCommands];

for (const cmd of allCommands) {
  registerCommand(cmd);
}
