# Phase 1: Fix xcli Bugs + Engineering Foundation

> **Goal:** Eliminate all P0 bugs and establish minimal engineering infrastructure so xcli's existing features actually work.

**Architecture:** Fix command routing, implement missing commands, add tsconfig/build, extract shared constants. No large-scale refactoring — daemon stays as-is until Phase 2.

**Tech Stack:** TypeScript (strict), Node.js >= 18, ESM

---

## Task 1: Fix list/ls routing bug

**Files:**
- Modify: `xcli/src/commands/execute-builtin.ts:42-43`
- Create: `xcli/src/commands/list.ts`

**Step 1: Create list command**

Create `xcli/src/commands/list.ts` that calls `daemonRequest('session.list', {})` and formats output.

**Step 2: Fix routing in execute-builtin.ts**

Change `list: removeCommand, ls: removeCommand` → `list: listCommand, ls: listCommand`

**Step 3: Add list to bin/xcli.ts builtin list**

Add `list` and `ls` to the builtin commands array if missing.

**Step 4: Verify**

Run: `npx tsx xcli/bin/xcli.ts list` — should list sessions, not delete plugins.

**Step 5: Commit**

```
fix(xcli): fix list/ls routing to listCommand instead of removeCommand
```

---

## Task 2: Implement kill command

**Files:**
- Modify: `xcli/src/commands/execute-builtin.ts:47-49`

**Step 1: Replace stub with actual implementation**

Change kill handler to call `killAllDaemon()` from daemon-manager.ts, which sends SIGKILL and cleans up session files.

**Step 2: Add kill to bin/xcli.ts builtin list**

Add `kill` if missing from the builtin commands array.

**Step 3: Verify**

Run: `npx tsx xcli/bin/xcli.ts kill` — should kill daemon process.

**Step 4: Commit**

```
fix(xcli): implement kill command to terminate daemon process
```

---

## Task 3: Fix missing commands in bin/xcli.ts

**Files:**
- Modify: `xcli/bin/xcli.ts:124-151`

**Step 1: Add missing commands**

Add `navigate`, `plugins`, `remove`, `install`, `goto` to the builtin commands array (or the `BUILTIN_COMMANDS` set).

**Step 2: Fix goto routing**

In `execute-builtin.ts`, change `goto: navigateCommand` → `goto: gotoCommand` so `xcli goto <url>` works directly (not through navigate's subcommand).

**Step 3: Verify**

Run: `npx tsx xcli/bin/xcli.ts plugins list` — should show installed plugins.

**Step 4: Commit**

```
fix(xcli): add missing builtin commands to CLI router
```

---

## Task 4: Delete dead code goto.ts or fix routing

**Files:**
- Modify: `xcli/src/commands/execute-builtin.ts:21`
- Possibly delete: `xcli/src/commands/goto.ts`

**Step 1: Decide approach**

goto.ts is imported but never used (goto key maps to navigateCommand). Either:
- A) Delete goto.ts, remove import — simpler
- B) Map `goto` to `gotoCommand` for direct URL navigation — more useful

Prefer option B since `xcli goto <url>` is more intuitive than `xcli navigate goto <url>`.

**Step 2: Update routing**

Change `goto: navigateCommand` → `goto: gotoCommand` in execute-builtin.ts.

**Step 3: Commit**

```
fix(xcli): route goto command to gotoCommand for direct URL navigation
```

---

## Task 5: Add tsconfig.json

**Files:**
- Create: `xcli/tsconfig.json`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", ".xcli"]
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit` in xcli/ — fix any errors that surface.

**Step 3: Commit**

```
feat(xcli): add tsconfig.json with strict mode
```

---

## Task 6: Add build/typecheck scripts

**Files:**
- Modify: `xcli/package.json`

**Step 1: Add scripts**

Add to package.json scripts:
- `"typecheck": "tsc --noEmit"`
- `"lint": "eslint src bin --ext .ts"`

**Step 2: Verify**

Run: `npm run typecheck` and `npm run lint` in xcli/.

**Step 3: Commit**

```
chore(xcli): add typecheck and lint scripts
```

---

## Task 7: Extract shared constants

**Files:**
- Create: `xcli/src/core/constants.ts`
- Modify: `xcli/src/core/session-client.ts:6-7`
- Modify: `xcli/src/core/session-daemon.ts:15`
- Modify: `xcli/src/core/daemon-manager.ts:10-11`
- Modify: `xcli/src/core/session-manager.ts:6`
- Modify: `xcli/src/commands/goto.ts:6`
- Modify: `xcli/src/commands/navigate.ts:6`

**Step 1: Create constants.ts**

```typescript
import { join } from 'path';
import { homedir } from 'os';

export const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
export const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');
export const DAEMON_SOCKET_PATH = join(SESSION_DIR, 'daemon.sock');
export const DEFAULT_CHROMIUM_PATH = '/Applications/Chromium.app/Contents/MacOS/Chromium';
```

**Step 2: Replace all local definitions with import**

In each of the 6 files, replace local SESSION_DIR/DAEMON_CONFIG_PATH with:
```typescript
import { SESSION_DIR, DAEMON_CONFIG_PATH } from './constants';
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck` in xcli/.

**Step 4: Commit**

```
refactor(xcli): extract shared constants to src/core/constants.ts
```

---

## Task 8: Unify SessionInfo type

**Files:**
- Create: `xcli/src/core/types.ts`
- Modify: `xcli/src/core/session-client.ts:9-14`
- Modify: `xcli/src/core/session-manager.ts:8-13`

**Step 1: Define unified SessionInfo in types.ts**

Merge both definitions into one:
```typescript
export interface SessionInfo {
  id: string;
  name: string;
  url: string;
  pid?: number;
  createdAt: string;
}
```

**Step 2: Replace local definitions with import**

Both session-client.ts and session-manager.ts import from types.ts.

**Step 3: Verify typecheck passes**

**Step 4: Commit**

```
refactor(xcli): unify SessionInfo type in src/core/types.ts
```

---

## What Phase 1 does NOT do

- No daemon splitting (Phase 2)
- No session-client deduplication (Phase 2)
- No session-manager.ts deletion (Phase 2)
- No any type elimination beyond new code (Phase 3)
- No test writing (Phase 3)
