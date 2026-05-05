# @dyyz1993/xpage

Browser automation engine library based on Playwright — recording, playback, page structure extraction, and command execution.

## Install

```bash
npm install @dyyz1993/xpage
```

Requires Node.js >= 18.0.0.

## Core Capabilities

### 1. Page Commands

Unified command interface, all operations via `(page, args) => Promise<result>`:

| Command | Description | Parameters |
|---------|-------------|------------|
| `goto` | Navigate to URL | `url`, `waitUntil?`, `timeout?` |
| `goBack` | Go back | — |
| `goForward` | Go forward | — |
| `reload` | Reload page | — |
| `title` | Get page title | — |
| `url` | Get current URL | — |
| `click` | Click element | `selector`, `timeout?`, `force?` |
| `fill` | Fill input | `selector`, `value`, `timeout?` |
| `type` | Type text | `selector`, `text`, `delay?` |
| `press` | Press key | `selector`, `key` |
| `hover` | Hover element | `selector`, `timeout?` |
| `scroll` | Scroll page | `selector?`, `x?`, `y?` |
| `select` | Select option | `selector`, `value` |
| `check` | Check checkbox | `selector` |
| `waitForSelector` | Wait for element | `selector`, `timeout?` |
| `query` | CSS selector query | `selector` |
| `find` | Find by text | `text`, `tag?`, `exact?` |
| `html` | Get HTML | `selector?`, `clean?` |
| `text` | Get text content | `selector?` |
| `textContent` | Get element text | `selector` |
| `inputValue` | Get input value | `selector` |
| `getAttribute` | Get attribute | `selector`, `name` |
| `structure` | Page structure extraction | `selector?`, `maxDepth?` |
| `screenshot` | Screenshot to file | `path?`, `fullPage?` |
| `screenshotBase64` | Screenshot as Base64 | `fullPage?`, `type?` |
| `a11y` | Accessibility tree | `selector?`, `format?` |
| `snapshot` | ARIA snapshot | `selector?` |
| `evaluate` | Execute JS expression | `expression` |
| `evaluateRaw` | Execute async JS | `script` |
| `wait` | Wait milliseconds | `timeout` |

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

await executePageCommand(page, 'goto', { url: 'https://example.com' });
const { title } = await executePageCommand(page, 'title', {});
const { snapshot } = await executePageCommand(page, 'snapshot', { selector: 'body' });

await browser.close();
```

### 2. Recorder (RecorderController)

Record user actions in a real browser, producing structured YAML.

```typescript
import { RecorderController } from '@dyyz1993/xpage';

const recorder = new RecorderController(page);
await recorder.start({ url: 'https://example.com', name: 'my-recording' });
// ... user interacts with browser ...
const { path, session } = await recorder.stop('./recordings/my-recording.yaml');
```

### 3. Player (PlaybackEngine)

Load recordings and replay them automatically.

```typescript
import { PlaybackEngine } from '@dyyz1993/xpage';

const player = await PlaybackEngine.fromFile(page, './recordings/my-recording.yaml');
const result = await player.play({ slowMo: 1, stopOnError: true });
```

### 4. Structure Extraction

Extract semantic layout tree from pages.

```typescript
const { structure, yaml } = await executePageCommand(page, 'structure', { selector: 'body' });
```

### 5. Accessibility Tree

```typescript
const { snapshot } = await executePageCommand(page, 'a11y', { selector: 'main', format: 'yaml' });
const { snapshot } = await executePageCommand(page, 'snapshot', { selector: 'body' });
```

## API Reference

### Command Execution

```typescript
import { executePageCommand, getCommandHandler, hasCommand } from '@dyyz1993/xpage';

const handler = getCommandHandler('click');
const exists = hasCommand('goto');
const result = await executePageCommand(page, 'click', { selector: '#btn' });
```

### Command Definitions & Parsing

```typescript
import { commands, getCommandNames, parseArgsToRecord, parseCommandChain } from '@dyyz1993/xpage';

commands['goto'].schema;
getCommandNames();
const parsed = parseCommandChain('goto url=https://example.com && click selector=#btn');
```

### Client IPC

```typescript
import { executeCommand, executePipeline, executeCommandChain, sendRequest } from '@dyyz1993/xpage';
```

### Session Management

```typescript
import {
  ensureStorage, getSessionPath, loadSessionInfo,
  saveSessionInfo, deleteSessionInfo, listSessions,
} from '@dyyz1993/xpage';
```

## Related Projects

- **@dyyz1993/xcli-core** — Plugin-based CLI framework built on this engine
- **create-xcli** — Project scaffolding tool
- **@dyyz1993/xcli-browser** — Browser domain reference implementation

## Development

```bash
npm run typecheck   # Type check
npm run lint        # ESLint
npm run build       # Build (tsup)
npm test            # Run tests
npm run validate    # typecheck + lint + build + test
```

## License

MIT
