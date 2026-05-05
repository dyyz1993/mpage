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

import { gotoCommand } from './goto.js';
import { refreshCommand } from './refresh.js';
import { backCommand } from './back.js';
import { forwardCommand } from './forward.js';

import { clickCommand } from './click.js';
import { fillCommand } from './fill.js';
import { typeCommand } from './type.js';
import { pressCommand } from './press.js';
import { selectCommand } from './select.js';
import { checkCommand } from './check.js';
import { hoverCommand } from './hover.js';
import { dblclickCommand } from './dblclick.js';

import { htmlCommand } from './html.js';
import { screenshotCommand } from './screenshot.js';
import { textCommand } from './text.js';
import { titleCommand } from './title.js';
import { urlCommand } from './url.js';
import { getPropertyCommand } from './get-property.js';

import { waitForSelectorCommand } from './wait-for-selector.js';
import { waitForTimeoutCommand } from './wait-for-timeout.js';

import { scrollCommand } from './scroll.js';
import { mouseCommand } from './mouse.js';

import { evalCommand } from './eval.js';
import { evaluateCommand } from './evaluate.js';

import { getCookiesCommand, setCookieCommand, clearCookiesCommand } from './cookies.js';
import {
  getLocalStorageCommand,
  setLocalStorageCommand,
  clearLocalStorageCommand,
} from './local-storage.js';

import { structureCommand } from './structure.js';
import { snapshotCommand } from './snapshot.js';

import { setViewportCommand } from './set-viewport.js';

export {
  gotoCommand,
  refreshCommand,
  backCommand,
  forwardCommand,
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
};

const commandList = [
  gotoCommand,
  refreshCommand,
  backCommand,
  forwardCommand,
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
];

for (const cmd of commandList) {
  registerCommand(cmd as RegisteredCommand);
}
