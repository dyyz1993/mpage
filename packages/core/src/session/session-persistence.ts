import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

/**
 * Adapter interface for session persistence.
 *
 * Core provides a default JSON file implementation ({@link FileSessionPersistence}),
 * but downstream projects can implement their own adapter (e.g. Redis, SQLite).
 *
 * @typeParam TMeta - Session metadata type. Must contain at least `id` and `name`.
 */
export interface SessionPersistence<TMeta extends { id: string; name: string }> {
  /** Save session metadata (partial update — merges with existing data). */
  save(name: string, data: Partial<TMeta>): void;

  /** Load session metadata by name. Returns `null` if not found. */
  load(name: string): TMeta | null;

  /** Delete persisted session metadata by name. */
  delete(name: string): void;

  /** List all persisted session metadata entries. */
  list(): TMeta[];
}

/**
 * Default file-based session persistence.
 *
 * Stores each session as a JSON file in `{baseDir}/{name}.json`.
 *
 * @typeParam TMeta - Session metadata type.
 */
export class FileSessionPersistence<
  TMeta extends { id: string; name: string },
> implements SessionPersistence<TMeta> {
  private readonly dir: string;

  constructor(baseDir?: string) {
    this.dir = baseDir ?? path.join(homedir(), '.xcli', 'sessions');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  save(name: string, data: Partial<TMeta>): void {
    const file = this.filePath(name);
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      /* new file */
    }
    Object.assign(existing, data, { name });
    fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  }

  load(name: string): TMeta | null {
    try {
      return JSON.parse(fs.readFileSync(this.filePath(name), 'utf8')) as TMeta;
    } catch {
      return null;
    }
  }

  delete(name: string): void {
    try {
      fs.unlinkSync(this.filePath(name));
    } catch {
      /* file may not exist */
    }
  }

  list(): TMeta[] {
    try {
      return fs
        .readdirSync(this.dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')) as TMeta;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is TMeta => entry !== null);
    } catch {
      return [];
    }
  }

  private filePath(name: string): string {
    return path.join(this.dir, `${name}.json`);
  }
}
