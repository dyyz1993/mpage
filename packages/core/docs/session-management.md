# Session Management

Guide to using the session management system in @dyyz1993/xcli-core.

## Overview

The session management system provides:

- **Session Creation** — Create unique sessions with metadata
- **Session Persistence** — Store session data to disk
- **Session Querying** — List, find, and search sessions
- **Session Archival** — Archive command history for replay
- **Session Cleanup** — Remove old or completed sessions

## Basic Usage

### Creating a Session

```typescript
import { createSessionMeta, sessions } from '@dyyz1993/xcli-core';

// Create session with metadata
const meta = createSessionMeta('default', {
  url: 'https://example.com',
  userAgent: 'Mozilla/5.0',
});

// Store session
sessions.set('default', meta);

console.log('Session created:', meta.id);
```

### Retrieving a Session

```typescript
import { getSession, findSession } from '@dyyz1993/xcli-core';

// Get session by ID
const session = getSession('default');

if (session) {
  console.log('Session URL:', session.metadata?.url);
  console.log('Created at:', session.createdAt);
}

// Find session by criteria
const found = findSession((meta) =>
  meta.metadata?.url === 'https://example.com'
);
```

### Listing Sessions

```typescript
import { listSessions } from '@dyyz1993/xcli-core';

// Get all sessions
const allSessions = listSessions();

allSessions.forEach((session) => {
  console.log(`ID: ${session.id}`);
  console.log(`Created: ${session.createdAt}`);
  console.log(`Metadata:`, session.metadata);
});
```

### Removing a Session

```typescript
import { removeSession, clearAllSessions } from '@dyyz1993/xcli-core';

// Remove specific session
removeSession('default');

// Remove all sessions
clearAllSessions();
```

## Session Metadata

### SessionMeta Structure

```typescript
interface SessionMeta {
  id: string;                    // UUID v4
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  metadata?: SessionMetadata;    // Custom metadata
}

interface SessionMetadata {
  url?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  // ... any custom fields
}
```

### Example: Creating Sessions with Metadata

```typescript
import { createSessionMeta, sessions } from '@dyyz1993/xcli-core';

// Browser session
const browserSession = createSessionMeta('browser-1', {
  url: 'https://example.com',
  userAgent: 'Mozilla/5.0',
  viewport: { width: 1920, height: 1080 },
});

sessions.set('browser-1', browserSession);

// Database session
const dbSession = createSessionMeta('db-1', {
  connectionString: 'postgresql://localhost/mydb',
  database: 'mydb',
  user: 'admin',
});

sessions.set('db-1', dbSession);
```

## Session Archival

The archival system stores command history for replay and analysis.

### Saving Commands to Archive

```typescript
import { appendCommandToArchive } from '@dyyz1993/xcli-core';

// Save command execution to archive
await appendCommandToArchive('default', {
  command: 'goto',
  args: { url: 'https://example.com' },
  timestamp: Date.now(),
  result: { ok: true },
});

await appendCommandToArchive('default', {
  command: 'click',
  args: { selector: '#button' },
  timestamp: Date.now(),
  result: { ok: true },
});
```

### Loading Archives

```typescript
import { loadArchive, listArchives } from '@dyyz1993/xcli-core';

// List all archives
const archives = listArchives();

for (const archive of archives) {
  console.log(`Archive: ${archive.sessionId}`);
  console.log(`Commands: ${archive.entries.length}`);
  console.log(`Created: ${archive.createdAt}`);
}

// Load specific archive
const archive = await loadArchive('default');

if (archive) {
  console.log('Command history:');
  archive.entries.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.command}`, entry.args);
  });
}
```

### Searching Archives

```typescript
import { searchArchives } from '@dyyz1993/xcli-core';

// Search for commands by type
const gotoCommands = searchArchives('default', {
  commandType: 'goto',
});

// Search by date range
const recentCommands = searchArchives('default', {
  startTime: Date.now() - 3600000, // Last hour
  endTime: Date.now(),
});

// Search by custom criteria
const customSearch = searchArchives('default', (entry) => {
  return entry.result?.ok === true;
});
```

### Comparing Archives

```typescript
import { diffArchives } from '@dyyz1993/xcli-core';

// Compare two archives
const diff = diffArchives('session-1', 'session-2');

console.log('Differences:');
diff.added.forEach((cmd) => console.log('Added:', cmd));
diff.removed.forEach((cmd) => console.log('Removed:', cmd));
diff.modified.forEach((mod) =>
  console.log('Modified:', mod.old, '→', mod.new)
);
```

## Session Manager

The `SessionManager` class provides high-level session operations.

### Creating a Session Manager

```typescript
import { SessionManager } from '@dyyz1993/xcli-core';

const manager = new SessionManager();
```

### Session Lifecycle

```typescript
// Create session
const meta = await manager.create('default', {
  url: 'https://example.com',
});

console.log('Session created:', meta.id);

// Update session
await manager.update('default', {
  metadata: { ...meta.metadata, viewport: { width: 800, height: 600 } },
});

// Get session
const session = await manager.get('default');

// Remove session
await manager.remove('default');
```

### Session Querying

```typescript
// Find sessions by criteria
const activeSessions = await manager.find((meta) =>
  meta.metadata?.url?.includes('example.com')
);

// Get session count
const count = await manager.count();

// Check if session exists
const exists = await manager.has('default');
```

## Advanced Usage

### Custom Session Storage

```typescript
import { configureArchiveStore } from '@dyyz1993/xcli-core';

// Configure archive storage location
configureArchiveStore({
  archiveDir: './custom-archive-dir',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100 MB
});

// Archives will now be stored in ./custom-archive-dir
```

### Session Event Hooks

```typescript
import { SessionManager } from '@dyyz1993/xcli-core';

const manager = new SessionManager({
  onCreate: (meta) => {
    console.log('Session created:', meta.id);
  },
  onUpdate: (meta) => {
    console.log('Session updated:', meta.id);
  },
  onRemove: (id) => {
    console.log('Session removed:', id);
  },
});
```

### Session with Timeout

```typescript
import { createSessionMeta, sessions, removeSession } from '@dyyz1993/xcli-core';

async function createSessionWithTimeout(
  id: string,
  metadata: SessionMetadata,
  timeout: number
) {
  const meta = createSessionMeta(id, metadata);
  sessions.set(id, meta);

  // Auto-remove after timeout
  setTimeout(() => {
    removeSession(id);
    console.log(`Session ${id} expired and was removed`);
  }, timeout);

  return meta;
}

// Session expires after 1 hour
const session = await createSessionWithTimeout(
  'temp-session',
  { url: 'https://example.com' },
  3600000
);
```

### Session Backup

```typescript
import { saveArchive, loadArchive } from '@dyyz1993/xcli-core';

// Backup session archive
async function backupSession(sessionId: string, backupPath: string) {
  const archive = await loadArchive(sessionId);
  if (!archive) return null;

  const backupData = JSON.stringify(archive, null, 2);
  await fs.promises.writeFile(backupPath, backupData);

  return backupPath;
}

// Restore session from backup
async function restoreSession(sessionId: string, backupPath: string) {
  const backupData = await fs.promises.readFile(backupPath, 'utf-8');
  const archive = JSON.parse(backupData);

  await saveArchive(archive);
  return archive;
}
```

## Best Practices

### 1. Use Descriptive Session IDs

```typescript
// Good
const session = createSessionMeta('browser-chrome-prod', { ... });

// Bad
const session = createSessionMeta('123', { ... });
```

### 2. Include Relevant Metadata

```typescript
const session = createSessionMeta('web-scraping', {
  url: 'https://example.com',
  userAgent: 'CustomBot/1.0',
  purpose: 'data-extraction',
  maxRequests: 1000,
});
```

### 3. Clean Up Old Sessions

```typescript
import { listSessions, removeSession } from '@dyyz1993/xcli-core';

function cleanupOldSessions(maxAge: number) {
  const sessions = listSessions();
  const now = Date.now();

  sessions.forEach((session) => {
    const age = now - new Date(session.createdAt).getTime();
    if (age > maxAge) {
      removeSession(session.id);
      console.log(`Removed old session: ${session.id}`);
    }
  });
}

// Remove sessions older than 24 hours
cleanupOldSessions(24 * 60 * 60 * 1000);
```

### 4. Use Archives for Audit Trails

```typescript
async function auditTrail(sessionId: string) {
  const archive = await loadArchive(sessionId);
  if (!archive) return [];

  return archive.entries.map((entry) => ({
    timestamp: new Date(entry.timestamp).toISOString(),
    command: entry.command,
    args: entry.args,
    result: entry.result,
  }));
}
```

## API Reference

### Functions

#### createSessionMeta

```typescript
function createSessionMeta(
  id: string,
  metadata?: SessionMetadata
): SessionMeta
```

#### getSession

```typescript
function getSession(id: string): SessionMeta | undefined
```

#### findSession

```typescript
function findSession(
  predicate: (meta: SessionMeta) => boolean
): SessionMeta | undefined
```

#### listSessions

```typescript
function listSessions(): SessionMeta[]
```

#### removeSession

```typescript
function removeSession(id: string): void
```

#### clearAllSessions

```typescript
function clearAllSessions(): void
```

#### appendCommandToArchive

```typescript
function appendCommandToArchive(
  sessionId: string,
  entry: CommandArchiveEntry
): Promise<void>
```

#### loadArchive

```typescript
function loadArchive(sessionId: string): Promise<SessionArchive | null>
```

#### listArchives

```typescript
function listArchives(): SessionArchive[]
```

#### searchArchives

```typescript
function searchArchives(
  sessionId: string,
  options?: SearchOptions | ((entry: CommandArchiveEntry) => boolean)
): CommandArchiveEntry[]
```

#### diffArchives

```typescript
function diffArchives(
  sessionId1: string,
  sessionId2: string
): ArchiveDiff
```

#### configureArchiveStore

```typescript
function configureArchiveStore(config: ArchiveStoreConfig): void
```

## See Also

- [Architecture](./architecture.md) — Framework architecture overview
- [Daemon Management](./daemon-management.md) — Background process management
- [Plugin System](./plugin-system.md) — Plugin development guide
