import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateExecution, type ToolCallRecord } from '../../src/validator.js';

// Mock loadArchive from session-archive.js
vi.mock('../../src/session/session-archive.js', () => ({
  loadArchive: vi.fn(),
}));

const { loadArchive } = await import('../../src/session/session-archive.js');

function tc(overrides: Partial<ToolCallRecord> = {}): ToolCallRecord {
  return {
    tool: 'click',
    timestamp: Date.now(),
    duration: 50,
    result: 'success',
    ...overrides,
  };
}

describe('validateExecution — L3 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compare with historical data when archive has >= 2 entries', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: { count: 10 } },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: { count: 10 } },
          duration: 1000,
          toolCalls: [],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, { count: 10 }, [], 's1', 'site', 'cmd', 1000);

    expect(loadArchive).toHaveBeenCalledWith('s1');
    expect(result.l3_regression.status).toBe('pass');
    expect(result.l3_regression.diff).toContain('与上次一致');
  });

  it('should detect data count changes (array length mismatch)', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: [1, 2, 3] },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: [1, 2] },
          duration: 1000,
          toolCalls: [],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, [1, 2], [], 's1', 'site', 'cmd', 1000);

    expect(result.l3_regression.status).toBe('warn');
    expect(result.l3_regression.diff).toContain('数据条数: 3 → 2');
  });

  it('should detect content changes (non-array data)', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: { status: 'ok', code: 200 } },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: { status: 'ok', code: 500 } },
          duration: 1000,
          toolCalls: [],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(
      true,
      { status: 'ok', code: 500 },
      [],
      's1',
      'site',
      'cmd',
      1000
    );

    expect(result.l3_regression.diff).toContain('数据内容有变化');
  });

  it('should warn on duration fluctuation > 50%', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1600,
          toolCalls: [],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, {}, [], 's1', 'site', 'cmd', 1600);

    expect(result.l3_regression.diff.some((d) => d.includes('耗时波动') && d.includes('60%'))).toBe(
      true
    );
  });

  it('should detect tool chain changes', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1000,
          toolCalls: [tc({ tool: 'toolA' }), tc({ tool: 'toolB', timestamp: 1050 })],
        },
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1000,
          toolCalls: [tc({ tool: 'toolA' }), tc({ tool: 'toolC', timestamp: 1050 })],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, {}, [], 's1', 'site', 'cmd', 1000);

    expect(result.l3_regression.diff.some((d) => d.includes('工具链路变化'))).toBe(true);
    expect(result.l3_regression.status).toBe('warn');
  });

  it('should warn on behavior score change > 15', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1000,
          toolCalls: [],
          validation: {
            l2_behavior: { score: 80 },
          },
        },
        {
          command: 'site cmd',
          result: { success: true, data: {} },
          duration: 1000,
          toolCalls: [],
          validation: {
            l2_behavior: { score: 60 },
          },
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, {}, [], 's1', 'site', 'cmd', 1000);

    expect(result.l3_regression.diff).toContain('行为评分变化: 80 → 60');
  });

  it('should return warn status for data count and tool chain changes', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: [1] },
          duration: 1000,
          toolCalls: [tc({ tool: 'A' })],
        },
        {
          command: 'site cmd',
          result: { success: true, data: [1, 2] },
          duration: 1000,
          toolCalls: [tc({ tool: 'B' })],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, [1, 2], [tc({ tool: 'B' })], 's1', 'site', 'cmd', 1000);

    expect(result.l3_regression.status).toBe('warn');
    expect(result.l3_regression.diff.some((d) => d.includes('数据条数'))).toBe(true);
    expect(result.l3_regression.diff.some((d) => d.includes('链路变化'))).toBe(true);
  });

  it('should compare against second-to-last execution when multiple archives', () => {
    const mockArchive = {
      commands: [
        {
          command: 'site cmd',
          result: { success: true, data: { count: 10 } },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: { count: 10 } },
          duration: 1000,
          toolCalls: [],
        },
        {
          command: 'site cmd',
          result: { success: true, data: { count: 10 } },
          duration: 1000,
          toolCalls: [],
        },
      ],
    };
    vi.mocked(loadArchive).mockReturnValue(mockArchive);

    const result = validateExecution(true, { count: 10 }, [], 's1', 'site', 'cmd', 1000);

    expect(loadArchive).toHaveBeenCalledWith('s1');
    expect(result.l3_regression.status).toBe('pass');
    expect(result.l3_regression.diff).toContain('与上次一致');
  });
});
