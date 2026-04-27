---
name: mpage-browser-automation
description: >
  Browser automation CLI based on Playwright/CDP. Use when: (1) automating web page interactions,
  (2) testing web UIs, (3) scraping page content, (4) recording/replaying user actions,
  (5) extracting accessibility snapshots. Triggers: mpage, browser automation, web testing,
  page interaction, screenshot, form filling, click, navigate, snapshot.
allowed-tools: [Bash, Read, Write, Edit]
---

# mpage Browser Automation

CLI tool for browser automation via CDP (Chrome DevTools Protocol). Installed globally as `mpage`.

## Quick Start

```bash
# Open page
mpage --session mysession "goto https://example.com"

# Chain commands with &&
mpage --session mysession "goto https://example.com && title && url"

# Wait for page load
mpage --session mysession "goto https://example.com && wait networkidle"
```

## Command Reference

### Navigation & State

| Command | Example | Description |
|---------|---------|-------------|
| `goto` | `goto https://example.com` | Navigate to URL |
| `url` | `url` | Get current URL |
| `title` | `title` | Get page title |
| `wait` | `wait networkidle` | Wait for load state (`load`, `domcontentloaded`, `networkidle`) |
| `wait` | `wait 3000` | Wait for N milliseconds |
| `close` | (CLI: `mpage --session s close`) | Close session |

### Content Extraction

| Command | Example | Description |
|---------|---------|-------------|
| `snapshot` | `snapshot` | ARIA accessibility tree (AI-friendly) |
| `a11y` | `a11y` | Detailed accessibility tree with roles/names |
| `text` | `text 'body'` | Get text content of selector |
| `html` | `html 'body'` | Get HTML content |
| `html` | `html 'body' --clean true` | Clean HTML (remove Vue attrs, scripts, empty elements) |
| `structure` | `structure` | Page layout structure with selectors |
| `screenshot` | `screenshot` | Take screenshot |
| `screenshotBase64` | `screenshotBase64` | Screenshot as base64 |

### Element Queries

| Command | Example | Description |
|---------|---------|-------------|
| `query` | `query 'button'` | Find elements by CSS selector, returns array with index/tag/id/class/text |
| `find` | `find '登录'` | Find elements by visible text (searches textContent, aria-label, title, alt, placeholder) |
| `find` | `find '提交' --tag button` | Find elements by text + tag filter |
| `find` | `find 'exact match' --exact true` | Exact text match |
| `inputValue` | `inputValue --selector '#input'` | Get input value |
| `getAttribute` | `getAttribute --selector '#el' --name href` | Get element attribute |

### Interaction

| Command | Example | Description |
|---------|---------|-------------|
| `click` | `click --selector '#btn'` | Click element |
| `fill` | `fill --selector '#input' --value 'text'` | Fill input (auto-dispatches input/change events for Vue/React) |
| `press` | `press Enter` | Press key (defaults to body) |
| `press` | `press Enter --selector 'textarea'` | Press key on specific element |
| `type` | `type --selector '#input' --text 'hello'` | Type text character by character |
| `hover` | `hover --selector '#el'` | Hover over element |
| `scroll` | `scroll --y 500` | Scroll page |
| `scroll` | `scroll --selector '#section'` | Scroll element into view |
| `select` | `select --selector '#sel' --value opt1` | Select dropdown option |
| `check` | `check --selector '#cb'` | Check checkbox |

### JavaScript Evaluation

| Command | Example | Description |
|---------|---------|-------------|
| `evaluate` | `evaluate 'document.title'` | Evaluate JS expression in page |
| `evaluate` | `evaluate 'document.querySelector(\"#btn\").click()'` | Execute JS in page context |

### Recording & Replay

| Command | Example | Description |
|---------|---------|-------------|
| `record start` | `mpage record start --url https://example.com` | Start recording user actions |
| `record stop` | `mpage record stop --output recording.yaml` | Stop and save recording |
| `record status` | `mpage record status` | Show recording status |
| `replay` | `mpage replay recording.yaml` | Replay recorded actions |
| `convert` | (via CLI) | Convert recording to JS/Python/Bash script |

## Workflow Patterns

### Pattern 1: Form Interaction

```bash
SESSION="form-test"
mpage --session $SESSION "goto https://example.com/form && wait networkidle"
mpage --session $SESSION "fill --selector '#name' --value 'John'"
mpage --session $SESSION "fill --selector '#email' --value 'john@test.com'"
mpage --session $SESSION "select --selector '#country' --value 'US'"
mpage --session $SESSION "click --selector '#submit'"
mpage --session $SESSION "wait networkidle"
mpage --session $SESSION "snapshot"
mpage --session $SESSION close
```

### Pattern 2: Content Extraction

```bash
SESSION="scrape"
mpage --session $SESSION "goto https://example.com && wait networkidle"
mpage --session $SESSION "find 'Article Title'"
mpage --session $SESSION "query 'h2.article-title'"
mpage --session $SESSION "text 'main'"
mpage --session $SESSION close
```

### Pattern 3: SPA State Verification

```bash
SESSION="spa-test"
mpage --session $SESSION "goto http://localhost:5173/ && wait networkidle"
mpage --session $SESSION "snapshot"         # Get full page structure
mpage --session $SESSION "find 'Dashboard'" # Find element by aria-label/text
mpage --session $SESSION "click --selector '#nav-settings'"
mpage --session $SESSION "wait networkidle"
mpage --session $SESSION "url"              # Verify navigation
mpage --session $SESSION "text 'body'"      # Get full page text
mpage --session $SESSION close
```

### Pattern 4: Send Message in Chat App

```bash
SESSION="chat"
mpage --session $SESSION "goto http://localhost:5173/ && wait networkidle"
mpage --session $SESSION "fill --selector 'textarea' --value 'Hello from mpage!'"
mpage --session $SESSION "press Enter"
sleep 5
mpage --session $SESSION "snapshot"
mpage --session $SESSION close
```

## Important Notes

1. **Session persistence**: Each `--session <name>` creates a persistent browser session. Always `close` when done.
2. **Cleanup**: `mpage kill` kills ALL sessions.
3. **`fill` triggers reactivity**: Automatically dispatches `input` and `change` events for Vue/React compatibility.
4. **`find` searches broadly**: Matches against textContent, aria-label, title, alt, placeholder attributes.
5. **`press` key first**: `press Enter` works (key is first param). Optional: `press Enter --selector textarea`.
6. **Use `snapshot` for exploration**: Returns ARIA tree — the best way to understand page structure before interacting.
7. **Evaluate for complex operations**: When built-in commands aren't enough, use `evaluate` to run arbitrary JS in the page.

## Common Pitfalls

- **Refs are per-snapshot**: Unlike agent-browser's `@e1` refs, mpage uses CSS selectors. Re-query after navigation.
- **Chinese text in selectors**: Some shells may need quoting. Use `find '中文'` instead of CSS selectors with Chinese.
- **SPA loading**: Always `wait networkidle` after navigation in SPA apps before interacting.
- **Session leaks**: Use `mpage kill` to clean up abandoned sessions.
