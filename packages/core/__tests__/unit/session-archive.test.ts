import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  saveArchive,
  loadArchive,
  listArchives,
  searchArchives,
  diffArchives,
  appendCommandToArchive,
  configureArchiveStore,
} from '../../src/session/session-archive.js';
import type { SessionArchive, CommandArchiveEntry } from '../../src/session/session-archive.js';

let tmpDir: string;

function makeArchive(id: string, name: string, cmds: CommandArchiveEntry[]): SessionArchive {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    endedAt: '',
    outline: cmds.map((c) => ({
      step: c.step,
      type: 'command' as const,
      command: c.command,
      status: c.result.success ? ('success' as const) : ('failure' as const),
      duration: c.duration,
    })),
    commands: cmds,
  };
}

function makeCommand(
  step: number,
  command: string,
  success: boolean,
  duration = 100
): CommandArchiveEntry {
  return {
    step,
    command,
    params: {},
    result: { success, data: [], tips: [] },
    toolCalls: [],
    duration,
    timestamp: Date.now(),
  };
}

describe('session-archive', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'xcli-archive-'));
    configureArchiveStore({ archiveDir: tmpDir });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('saveArchive()', () => {
    it('should save archive to file and return path', () => {
      const archive = makeArchive('sid-1', 'test', []);
      const filePath = saveArchive(archive);
      expect(filePath).toBe(join(tmpDir, 'sid-1.json'));
      expect(existsSync(filePath)).toBe(true);
    });

    it('should write valid JSON', () => {
      const archive = makeArchive('sid-2', 'test', [makeCommand(1, 'scrape', true)]);
      saveArchive(archive);
      const raw = require('fs').readFileSync(join(tmpDir, 'sid-2.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.id).toBe('sid-2');
      expect(parsed.commands).toHaveLength(1);
    });

    it('should set endedAt on save', () => {
      const archive = makeArchive('sid-3', 'test', []);
      archive.endedAt = '';
      saveArchive(archive);
      const loaded = loadArchive('sid-3');
      expect(loaded!.endedAt).not.toBe('');
    });

    it('should create archive dir if not exists', () => {
      const nestedDir = join(tmpDir, 'nested', 'deep');
      configureArchiveStore({ archiveDir: nestedDir });
      const archive = makeArchive('sid-4', 'test', []);
      saveArchive(archive);
      expect(existsSync(join(nestedDir, 'sid-4.json'))).toBe(true);
    });
  });

  describe('loadArchive()', () => {
    it('should load archive by id', () => {
      const archive = makeArchive('load-1', 'test', [makeCommand(1, 'cmd', true)]);
      saveArchive(archive);
      const loaded = loadArchive('load-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('load-1');
      expect(loaded!.commands).toHaveLength(1);
    });

    it('should return null for non-existent archive', () => {
      expect(loadArchive('no-such-id')).toBeNull();
    });

    it('should handle corrupted JSON file', () => {
      writeFileSync(join(tmpDir, 'corrupt.json'), '{bad json', 'utf-8');
      expect(() => loadArchive('corrupt')).toThrow();
    });
  });

  describe('listArchives()', () => {
    it('should return empty array when no archives', () => {
      expect(listArchives()).toEqual([]);
    });

    it('should list all archives', () => {
      saveArchive(makeArchive('l-1', 'a', []));
      saveArchive(makeArchive('l-2', 'b', []));
      const list = listArchives();
      expect(list).toHaveLength(2);
      const ids = list.map((a) => a.id);
      expect(ids).toContain('l-1');
      expect(ids).toContain('l-2');
    });

    it('should ignore non-json files', () => {
      writeFileSync(join(tmpDir, 'notes.txt'), 'hello', 'utf-8');
      saveArchive(makeArchive('l-3', 'c', []));
      expect(listArchives()).toHaveLength(1);
    });
  });

  describe('searchArchives()', () => {
    beforeEach(() => {
      const archive1 = makeArchive('s-1', 'test', [makeCommand(1, 'scrape', true)]);
      archive1.createdAt = '2025-01-10T00:00:00.000Z';
      saveArchive(archive1);

      const archive2 = makeArchive('s-2', 'test', [makeCommand(1, 'navigate', false)]);
      archive2.createdAt = '2025-02-15T00:00:00.000Z';
      saveArchive(archive2);

      const archive3 = makeArchive('s-3', 'test', [
        makeCommand(1, 'scrape', false),
        makeCommand(2, 'click', true),
      ]);
      archive3.createdAt = '2025-03-20T00:00:00.000Z';
      saveArchive(archive3);
    });

    it('should filter by failed=true', () => {
      const results = searchArchives({ failed: true });
      expect(results).toHaveLength(2);
      const ids = results.map((a) => a.id);
      expect(ids).toContain('s-2');
      expect(ids).toContain('s-3');
    });

    it('should filter by command name', () => {
      const results = searchArchives({ command: 'scrape' });
      expect(results).toHaveLength(2);
      const ids = results.map((a) => a.id);
      expect(ids).toContain('s-1');
      expect(ids).toContain('s-3');
    });

    it('should filter by date range (from)', () => {
      const results = searchArchives({ from: '2025-03-01' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('s-3');
    });

    it('should filter by date range (to)', () => {
      const results = searchArchives({ to: '2025-01-31' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('s-1');
    });

    it('should combine filters', () => {
      const results = searchArchives({ failed: true, command: 'scrape' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('s-3');
    });

    it('should return all when no filters', () => {
      expect(searchArchives({})).toHaveLength(3);
    });
  });

  describe('diffArchives()', () => {
    it('should detect success change', () => {
      const a = makeArchive('d-1', 'a', [makeCommand(1, 'scrape', true)]);
      const b = makeArchive('d-2', 'b', [makeCommand(1, 'scrape', false)]);
      const diffs = diffArchives(a, b);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].differences).toContain('success: true → false');
    });

    it('should detect duration change', () => {
      const a = makeArchive('d-3', 'a', [makeCommand(1, 'scrape', true, 100)]);
      const b = makeArchive('d-4', 'b', [makeCommand(1, 'scrape', true, 200)]);
      const diffs = diffArchives(a, b);
      expect(diffs[0].differences).toContain('duration: 100ms → 200ms');
    });

    it('should detect data count change', () => {
      const a = makeArchive('d-5', 'a', []);
      a.commands = [
        { ...makeCommand(1, 'scrape', true), result: { success: true, data: [1, 2], tips: [] } },
      ];
      const b = makeArchive('d-6', 'b', []);
      b.commands = [
        { ...makeCommand(1, 'scrape', true), result: { success: true, data: [1, 2, 3], tips: [] } },
      ];
      const diffs = diffArchives(a, b);
      expect(diffs[0].differences).toContain('data count: 2 → 3');
    });

    it('should detect only-in-A / only-in-B', () => {
      const a = makeArchive('d-7', 'a', [makeCommand(1, 'scrape', true)]);
      const b = makeArchive('d-8', 'b', []);
      const diffs = diffArchives(a, b);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].differences).toContain('only in A');
    });

    it('should filter by command name', () => {
      const a = makeArchive('d-9', 'a', [
        makeCommand(1, 'scrape', true),
        makeCommand(2, 'click', true),
      ]);
      const b = makeArchive('d-10', 'b', [
        makeCommand(1, 'scrape', false),
        makeCommand(2, 'click', true),
      ]);
      const diffs = diffArchives(a, b, 'scrape');
      expect(diffs).toHaveLength(1);
      expect(diffs[0].differences).toContain('success: true → false');
    });

    it('should return empty differences for identical commands', () => {
      const a = makeArchive('d-11', 'a', [makeCommand(1, 'scrape', true, 50)]);
      const b = makeArchive('d-12', 'b', [makeCommand(1, 'scrape', true, 50)]);
      const diffs = diffArchives(a, b);
      expect(diffs[0].differences).toEqual([]);
    });
  });

  describe('appendCommandToArchive()', () => {
    it('should create new archive if not exists and append command', () => {
      appendCommandToArchive('append-1', 'my-session', makeCommand(1, 'scrape', true));
      const loaded = loadArchive('append-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('append-1');
      expect(loaded!.name).toBe('my-session');
      expect(loaded!.commands).toHaveLength(1);
      expect(loaded!.outline).toHaveLength(1);
    });

    it('should append to existing archive', () => {
      appendCommandToArchive('append-2', 's', makeCommand(1, 'scrape', true));
      appendCommandToArchive('append-2', 's', makeCommand(2, 'click', false));
      const loaded = loadArchive('append-2');
      expect(loaded!.commands).toHaveLength(2);
      expect(loaded!.outline).toHaveLength(2);
      expect(loaded!.outline[1].status).toBe('failure');
    });
  });

  describe('configureArchiveStore()', () => {
    it('should change the storage directory', () => {
      const dir2 = mkdtempSync(join(tmpdir(), 'xcli-archive2-'));
      configureArchiveStore({ archiveDir: dir2 });
      const archive = makeArchive('cfg-1', 'test', []);
      saveArchive(archive);
      expect(existsSync(join(dir2, 'cfg-1.json'))).toBe(true);
      expect(existsSync(join(tmpDir, 'cfg-1.json'))).toBe(false);
      rmSync(dir2, { recursive: true, force: true });
    });
  });
});
