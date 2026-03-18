# mpage - Browser Automation & Recording Tool

Browser automation and recording tool with CDP (Chrome DevTools Protocol) support.

## Features

- 🎬 **Recording**: Record user interactions with DOM diff tracking
- 🔄 **Replay**: Replay recorded actions with timing preservation
- 🔍 **Extract**: Extract key events for LLM analysis
- 🧹 **Filter**: Remove debug events to reduce file size
- 📊 **DOM Diff**: Track page state changes between events

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Start Recording

```bash
# Using CDP port (recommended)
npx tsx bin/mpage.ts --cdp 9221 record start --url https://example.com

# Or using full WebSocket URL
npx tsx bin/mpage.ts --cdp ws://localhost:9221/devtools/browser/xxx record start --url https://example.com
```

### 2. Stop Recording

```bash
npx tsx bin/mpage.ts record stop --output recording.yaml
```

### 3. Extract Key Events

```bash
npx tsx bin/mpage.ts extract recording.yaml
# Output: recording-summary.json (for LLM)
```

### 4. Filter Debug Events

```bash
npx tsx bin/mpage.ts filter recording.yaml filtered.yaml
# Default: removes debug events, reduces 70%+ size
```

### 5. Replay

```bash
npx tsx bin/mpage.ts --cdp 9221 replay recording.yaml
```

## Commands

### `record start`
Start recording user interactions.

```bash
npx tsx bin/mpage.ts --cdp 9221 record start --url https://example.com
```

Options:
- `--url <url>`: Initial URL to navigate to

### `record stop`
Stop recording and save to file.

```bash
npx tsx bin/mpage.ts record stop --output recording.yaml
```

Options:
- `--output <path>`: Output file path (default: recording.yaml)

### `extract`
Extract key events for LLM analysis.

```bash
npx tsx bin/mpage.ts extract recording.yaml
```

Output:
- `recording-summary.json`: JSON file with key events and statistics

### `filter`
Filter debug events from recording.

```bash
npx tsx bin/mpage.ts filter input.yaml output.yaml [--exclude-types=type1,type2]
```

Default excluded types:
- Debug: `panel_item_added`, `panel_debug`, `panel_items_count`, `panel_debug_detail`
- Auto: `navigation`, `panel_appeared`, `panel_items`, `blur`, `focus`, `dom_change`, `tab_open`
- Mouse: `click_inferred`, `pointerup`, `pointerdown`, `mouseup`, `mousedown`
- Position: `element_at_position`, `element_at_click`

**Note:** `mousemove` is NOT filtered by default to preserve mouse trajectory for realistic replay.

### `replay`
Replay recorded actions.

```bash
npx tsx bin/mpage.ts --cdp 9221 replay recording.yaml
```

Options:
- `--slow-mo <ms>`: Slow down replay (default: 0)
- `--stop-on-error`: Stop on first error

### `session list`
List all active sessions.

```bash
npx tsx bin/mpage.ts session list
```

### `close`
Close current session.

```bash
npx tsx bin/mpage.ts close
```

### `kill`
Kill all sessions.

```bash
npx tsx bin/mpage.ts kill
```

## Event Types

### User Interaction Events (Keep)
| Type | Description |
|------|-------------|
| `click` | Mouse click |
| `input` | Text input |
| `keydown/keyup` | Keyboard events |
| `hover_enter` | Mouse enter element |
| `hover_leave` | Mouse leave element |

### Debug Events (Filter)
| Type | Description |
|------|-------------|
| `panel_item_added` | Debug: panel item added |
| `panel_debug` | Debug: panel debug info |
| `element_at_position` | Debug: element position |
| `navigation` | Auto: page navigation |
| `dom_change` | Auto: DOM change |

## DOM Diff

Each important event (click, input, keydown, navigation) includes:

```yaml
domDiff:
  visibleText: "Page visible text..."
  keySelectors:
    - selector: "[data-testid='submit-button']"
      tagName: button
      text: Submit
      visible: true
```

## Selector Strategy

Selectors are generated in this priority:

1. `data-testid` attribute (most stable)
2. `data-id` attribute
3. Semantic tags (article, nav, main, etc.)
4. `id` attribute
5. Meaningful class names (filtered framework hashes)
6. Path-based selector with nth-of-type

## Workflow for LLM Integration

1. **Record**: Capture full user interaction
2. **Extract**: Generate summary for LLM
3. **LLM Analysis**: LLM extracts key operations
4. **Filter**: Create clean version for replay
5. **Replay**: Execute the actions

## Examples

### Record and Analyze

```bash
# 1. Start recording
npx tsx bin/mpage.ts --cdp 9221 record start --url https://www.doubao.com/

# 2. Perform actions in browser...

# 3. Stop recording
npx tsx bin/mpage.ts record stop --output doubao.yaml

# 4. Extract for LLM
npx tsx bin/mpage.ts extract doubao.yaml
# -> doubao-summary.json

# 5. Filter for replay
npx tsx bin/mpage.ts filter doubao.yaml doubao-filtered.yaml
# 971 events -> 276 events (72% reduction)

# 6. Replay
npx tsx bin/mpage.ts --cdp 9221 replay doubao-filtered.yaml
```

## Tips

1. **Use `data-testid`**: Add `data-testid` attributes to your elements for stable selectors
2. **Filter before replay**: Reduces file size and improves reliability
3. **Check summary first**: Use `extract` to understand what was recorded
4. **CDP port**: Use `--cdp 9221` for simplicity (auto-converts to WebSocket URL)

## Troubleshooting

### "Failed to create session"
- Ensure Chrome is running with `--remote-debugging-port=9221`
- Check if port is available: `curl http://localhost:9221/json/version`

### "Target page has been closed"
- The browser tab was closed during replay
- Start a new session and try again

### Recording too large
- Use `filter` command to remove debug events
- Typical reduction: 70%+

## Architecture

```
bin/
├── mpage.ts          # CLI entry point
└── mpage-server.ts   # Server process

src/
├── client/
│   ├── ipc.ts              # IPC communication
│   └── session-manager.ts  # Session management
├── server/
│   ├── index.ts            # Server entry
│   └── recorder/
│       ├── controller.ts   # Recording controller
│       ├── inject.ts       # Browser injection script
│       └── player.ts       # Playback engine
└── types.ts          # TypeScript types
```
