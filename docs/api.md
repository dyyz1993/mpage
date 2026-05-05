# API Reference

Complete API documentation for `@dyyz1993/xpage`.

## Table of Contents

- [Command Execution](#command-execution)
- [Page Commands](#page-commands)
- [Recording](#recording)
- [Playback](#playback)
- [Session Management](#session-management)
- [Utility Functions](#utility-functions)
- [Types](#types)

## Command Execution

### executePageCommand

Execute a single page command.

```typescript
function executePageCommand(
  page: Page,
  commandName: string,
  args: Record<string, unknown>
): Promise<CommandResult<unknown>>
```

**Parameters:**
- `page` - Playwright Page instance
- `commandName` - Name of the command to execute
- `args` - Command arguments (validated against command schema)

**Returns:** Promise resolving to `CommandResult<T>`

**Example:**
```typescript
const { title } = await executePageCommand(page, 'title', {});
```

### getCommandHandler

Get a command handler function.

```typescript
function getCommandHandler(commandName: string): CommandHandler | undefined
```

**Example:**
```typescript
const handler = getCommandHandler('click');
if (handler) {
  await handler(page, { selector: '#btn' });
}
```

### hasCommand

Check if a command exists.

```typescript
function hasCommand(commandName: string): boolean
```

**Example:**
```typescript
if (hasCommand('goto')) {
  console.log('goto command is available');
}
```

### executeCommandChain

Execute a chain of commands.

```typescript
function executeCommandChain(
  page: Page,
  input: string,
  options?: ChainExecutionOptions
): Promise<ChainExecutionResult>
```

**Parameters:**
- `page` - Playwright Page instance
- `input` - Command chain string (e.g., `goto url=... && title`)
- `options` - Optional execution options

**Example:**
```typescript
const result = await executeCommandChain(page, `
  goto url=https://example.com &&
  title &&
  screenshot path=screen.png
`);
```

## Page Commands

### Navigation Commands

#### goto

Navigate to a URL.

```typescript
interface GotoArgs {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

const result = await executePageCommand(page, 'goto', { url: 'https://example.com' });
```

#### goBack

Go back in browser history.

```typescript
await executePageCommand(page, 'goBack', {});
```

#### goForward

Go forward in browser history.

```typescript
await executePageCommand(page, 'goForward', {});
```

#### reload

Reload the current page.

```typescript
await executePageCommand(page, 'reload', {});
```

#### title

Get page title.

```typescript
const { title } = await executePageCommand(page, 'title', {});
```

#### url

Get current page URL.

```typescript
const { url } = await executePageCommand(page, 'url', {});
```

### Interaction Commands

#### click

Click an element.

```typescript
interface ClickArgs {
  selector: string;
  timeout?: number;
  force?: boolean;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

await executePageCommand(page, 'click', { selector: '#button' });
```

#### fill

Fill an input field (clears first).

```typescript
interface FillArgs {
  selector: string;
  value: string;
  timeout?: number;
}

await executePageCommand(page, 'fill', {
  selector: '#input',
  value: 'Hello World',
});
```

#### type

Type text character by character.

```typescript
interface TypeArgs {
  selector: string;
  text: string;
  delay?: number;
}

await executePageCommand(page, 'type', {
  selector: '#search',
  text: 'keyword',
  delay: 50,
});
```

#### press

Press a key.

```typescript
interface PressArgs {
  selector: string;
  key: string;
}

await executePageCommand(page, 'press', { selector: 'body', key: 'Enter' });
```

#### hover

Hover over an element.

```typescript
interface HoverArgs {
  selector: string;
  timeout?: number;
}

await executePageCommand(page, 'hover', { selector: '#menu' });
```

#### select

Select an option from a dropdown.

```typescript
interface SelectArgs {
  selector: string;
  value: string;
}

await executePageCommand(page, 'select', {
  selector: '#dropdown',
  value: 'option1',
});
```

#### check

Check a checkbox.

```typescript
interface CheckArgs {
  selector: string;
}

await executePageCommand(page, 'check', { selector: '#agree' });
```

#### dblclick

Double-click an element.

```typescript
interface DblclickArgs {
  selector: string;
  timeout?: number;
}

await executePageCommand(page, 'dblclick', { selector: '#item' });
```

### Query Commands

#### html

Get HTML content.

```typescript
interface HtmlArgs {
  selector?: string;
  clean?: boolean;
}

const { html } = await executePageCommand(page, 'html', { selector: '#main' });
```

#### text

Get text content.

```typescript
interface TextArgs {
  selector?: string;
}

const { text } = await executePageCommand(page, 'text', { selector: '.content' });
```

#### textContent

Get element's textContent.

```typescript
const { textContent } = await executePageCommand(page, 'textContent', {
  selector: '#element',
});
```

#### inputValue

Get input value.

```typescript
const { value } = await executePageCommand(page, 'inputValue', {
  selector: '#input',
});
```

#### getAttribute

Get element attribute.

```typescript
interface GetAttributeArgs {
  selector: string;
  name: string;
}

const { value } = await executePageCommand(page, 'getAttribute', {
  selector: '#link',
  name: 'href',
});
```

#### query

Query elements with CSS selector.

```typescript
interface QueryArgs {
  selector: string;
}

const { elements } = await executePageCommand(page, 'query', {
  selector: '.item',
});
```

#### find

Find element by text content.

```typescript
interface FindArgs {
  text: string;
  tag?: string;
  exact?: boolean;
}

const { element } = await executePageCommand(page, 'find', {
  text: 'Login',
  tag: 'a',
});
```

### Wait Commands

#### waitForSelector

Wait for element to appear.

```typescript
interface WaitForSelectorArgs {
  selector: string;
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

await executePageCommand(page, 'waitForSelector', {
  selector: '#content',
  timeout: 5000,
});
```

#### wait

Wait for a specified duration.

```typescript
interface WaitArgs {
  timeout: number;
}

await executePageCommand(page, 'wait', { timeout: 1000 });
```

### Scroll Commands

#### scroll

Scroll the page.

```typescript
interface ScrollArgs {
  selector?: string;
  x?: number;
  y?: number;
}

await executePageCommand(page, 'scroll', { y: 500 });
```

### Evaluate Commands

#### evaluate

Evaluate JavaScript expression.

```typescript
interface EvaluateArgs {
  expression: string;
}

const { result } = await executePageCommand(page, 'evaluate', {
  expression: 'document.title',
});
```

#### evaluateRaw

Evaluate async JavaScript function.

```typescript
interface EvaluateRawArgs {
  script: string;
}

const { result } = await executePageCommand(page, 'evaluateRaw', {
  script: 'async () => { return await fetch("/api").then(r => r.json()) }',
});
```

### Screenshot Commands

#### screenshot

Take a screenshot to file.

```typescript
interface ScreenshotArgs {
  path?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
}

await executePageCommand(page, 'screenshot', {
  path: 'screenshot.png',
  fullPage: true,
});
```

#### screenshotBase64

Take screenshot as Base64 string.

```typescript
interface ScreenshotBase64Args {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
}

const { base64 } = await executePageCommand(page, 'screenshotBase64', {});
```

### Structure Commands

#### structure

Extract page structure.

```typescript
interface StructureArgs {
  selector?: string;
  maxDepth?: number;
}

const { structure, yaml } = await executePageCommand(page, 'structure', {
  selector: 'body',
  maxDepth: 5,
});
```

### Accessibility Commands

#### a11y

Get accessibility tree.

```typescript
interface A11yArgs {
  selector?: string;
  format?: 'yaml' | 'json';
}

const { snapshot } = await executePageCommand(page, 'a11y', {
  selector: 'main',
  format: 'yaml',
});
```

#### snapshot

Get ARIA snapshot.

```typescript
interface SnapshotArgs {
  selector?: string;
}

const { snapshot } = await executePageCommand(page, 'snapshot', {
  selector: 'body',
});
```

## Recording

### RecorderController

Record user actions in a browser.

```typescript
class RecorderController {
  constructor(page: Page);

  start(options: StartOptions): Promise<void>;
  stop(outputPath?: string): Promise<RecordingResult>;
  getEvents(): RecordedEvent[];
}
```

### start

Start recording.

```typescript
interface StartOptions {
  url?: string;
  name?: string;
  session?: string;
}

const recorder = new RecorderController(page);
await recorder.start({
  url: 'https://example.com',
  name: 'my-recording',
});
```

### stop

Stop recording and save.

```typescript
interface RecordingResult {
  path: string;
  session: RecordingSession;
}

const { path } = await recorder.stop('./recording.yaml');
```

## Playback

### PlaybackEngine

Replay recorded actions.

```typescript
class PlaybackEngine {
  static fromFile(page: Page, filePath: string): Promise<PlaybackEngine>;

  play(options?: PlaybackOptions): Promise<PlaybackResult>;
}
```

### fromFile

Load recording from file.

```typescript
const player = await PlaybackEngine.fromFile(page, './recording.yaml');
```

### play

Replay the recording.

```typescript
interface PlaybackOptions {
  slowMo?: number;
  stopOnError?: boolean;
}

interface PlaybackResult {
  success: boolean;
  eventsPlayed: number;
  errors: Array<{ event: RecordedEvent; error: Error }>;
  duration: number;
}

const result = await player.play({
  slowMo: 100,
  stopOnError: true,
});
```

## Session Management

### ensureStorage

Ensure session storage directory exists.

```typescript
function ensureStorage(baseDir?: string): string
```

### getSessionPath

Get session file path.

```typescript
function getSessionPath(sessionId: string): string
```

### loadSessionInfo

Load session information.

```typescript
function loadSessionInfo(sessionId: string): SessionInfo | null
```

### saveSessionInfo

Save session information.

```typescript
function saveSessionInfo(info: SessionInfo): void
```

### deleteSessionInfo

Delete session information.

```typescript
function deleteSessionInfo(sessionId: string): void
```

### listSessions

List all sessions.

```typescript
function listSessions(): SessionInfo[]
```

## Utility Functions

### getCommandNames

Get all registered command names.

```typescript
function getCommandNames(): string[]
```

### commands

Access command definitions.

```typescript
const commands: Record<string, CommandDefinition>
```

### parseArgsToRecord

Parse command arguments.

```typescript
function parseArgsToRecord(args: string[]): Record<string, unknown>
```

### parseCommandChain

Parse command chain string.

```typescript
function parseCommandChain(input: string): Pipeline[]
```

## Types

### CommandResult

```typescript
interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}
```

### ChainExecutionResult

```typescript
interface ChainExecutionResult {
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
}

interface StepResult {
  command: string;
  success: boolean;
  raw: string;
  duration: number;
  error?: Error;
}
```

### RecordedEvent

```typescript
interface RecordedEvent {
  type: string;
  selector: string;
  tagName: string;
  data?: Record<string, unknown>;
  timestamp: number;
  pageState?: PageState;
}
```

### RecordingSession

```typescript
interface RecordingSession {
  id: string;
  name: string;
  startUrl: string;
  startTime: string;
  duration: number;
  events: RecordedEvent[];
}
```

### SessionInfo

```typescript
interface SessionInfo {
  sessionId: string;
  createdAt: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
```

## Related Projects

- **@dyyz1993/xcli-core** — CLI framework
- **@dyyz1993/xbrowser** — Browser automation CLI

## License

MIT
