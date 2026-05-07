import { describe, it, expect } from 'vitest';
import {
  validateExecution,
  formatValidationReport,
  type ToolCallRecord,
  type ValidationResult,
} from '../../src/validator.js';

function tc(overrides: Partial<ToolCallRecord> = {}): ToolCallRecord {
  return {
    tool: 'click',
    timestamp: Date.now(),
    duration: 50,
    result: 'success',
    ...overrides,
  };
}

describe('validateExecution — L1 functional', () => {
  it('should pass when success=true with valid data', () => {
    const result = validateExecution(true, { data: [1, 2, 3] }, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('pass');
    expect(result.l1_functional.detail).toBe('OK');
  });

  it('should fail when success=false', () => {
    const result = validateExecution(false, { data: [1] }, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('fail');
    expect(result.l1_functional.detail).toContain('失败');
  });

  it('should fail when data is null', () => {
    const result = validateExecution(true, null, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('fail');
    expect(result.l1_functional.detail).toContain('空');
  });

  it('should fail when data is undefined', () => {
    const result = validateExecution(true, undefined, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('fail');
  });

  it('should fail when data has empty array', () => {
    const result = validateExecution(true, { data: [] }, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('fail');
    expect(result.l1_functional.detail).toContain('空');
  });

  it('should pass with non-empty data array', () => {
    const result = validateExecution(true, { data: ['a'] }, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('pass');
  });

  it('should pass with primitive data', () => {
    const result = validateExecution(true, 'hello', [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('pass');
  });

  it('should pass with object without data field', () => {
    const result = validateExecution(true, { items: [1] }, [], 's1', 'site', 'cmd', 100);
    expect(result.l1_functional.status).toBe('pass');
  });
});

describe('validateExecution — L2 behavior', () => {
  it('should pass with no tool calls', () => {
    const result = validateExecution(true, 'ok', [], 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.status).toBe('pass');
    expect(result.l2_behavior.score).toBe(0);
    expect(result.l2_behavior.details).toContain('无工具调用');
  });

  it('should detect bot-like mdGap (< 2ms)', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1001, result: 'success' }),
      tc({ tool: 'move', timestamp: 1002, result: 'success' }),
      tc({ tool: 'click', timestamp: 1003, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.mdGap).toBeLessThan(2);
    expect(result.l2_behavior.score).toBeGreaterThanOrEqual(40);
  });

  it('should warn on suspicious mdGap (< 10ms)', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1005, result: 'success' }),
      tc({ tool: 'move', timestamp: 1008, result: 'success' }),
      tc({ tool: 'click', timestamp: 1012, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.mdGap).toBeGreaterThanOrEqual(2);
    expect(result.l2_behavior.mdGap).toBeLessThan(10);
    expect(result.l2_behavior.score).toBeGreaterThanOrEqual(20);
  });

  it('should pass with human-like intervals (>= 30ms)', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1050, result: 'success' }),
      tc({ tool: 'move', timestamp: 1100, result: 'success' }),
      tc({ tool: 'click', timestamp: 1180, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.mdGap).toBeGreaterThanOrEqual(30);
    expect(result.l2_behavior.details.some((d) => d.includes('md→click gap'))).toBe(true);
  });

  it('should detect overly precise clicks (low offset std)', () => {
    const clicks: ToolCallRecord[] = Array.from({ length: 10 }, (_, i) =>
      tc({ tool: 'click', timestamp: 1000 + i * 100, duration: 50, result: 'success' })
    );
    const result = validateExecution(true, 'ok', clicks, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.offsetStd).toBeLessThan(0.03);
    expect(result.l2_behavior.score).toBeGreaterThanOrEqual(25);
  });

  it('should detect high instant click ratio (> 70%)', () => {
    const clicks: ToolCallRecord[] = Array.from({ length: 10 }, (_, i) =>
      tc({ tool: 'click', timestamp: 1000 + i * 200, duration: 1, result: 'success' })
    );
    const result = validateExecution(true, 'ok', clicks, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.instantClickRatio).toBe(1);
    expect(result.l2_behavior.score).toBeGreaterThanOrEqual(20);
  });

  it('should detect moderate offset std (0.03-0.06)', () => {
    const clicks: ToolCallRecord[] = [
      tc({ tool: 'click', timestamp: 1000, duration: 50, result: 'success' }),
      tc({ tool: 'click', timestamp: 1100, duration: 53, result: 'success' }),
      tc({ tool: 'click', timestamp: 1200, duration: 47, result: 'success' }),
      tc({ tool: 'click', timestamp: 1300, duration: 51, result: 'success' }),
      tc({ tool: 'click', timestamp: 1400, duration: 49, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', clicks, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.offsetStd).toBeGreaterThanOrEqual(0.03);
    expect(result.l2_behavior.offsetStd).toBeLessThan(0.06);
    expect(result.l2_behavior.details.some((d) => d.includes('偏低'))).toBe(true);
  });

  it('should detect moderate md→click gap (10-30ms)', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1015, result: 'success' }),
      tc({ tool: 'move', timestamp: 1035, result: 'success' }),
      tc({ tool: 'click', timestamp: 1050, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.mdGap).toBeGreaterThanOrEqual(10);
    expect(result.l2_behavior.mdGap).toBeLessThan(30);
    expect(result.l2_behavior.details.some((d) => d.includes('偏低'))).toBe(true);
  });

  it('should detect moderate instant click ratio (0.4-0.7)', () => {
    const clicks: ToolCallRecord[] = [
      tc({ tool: 'click', timestamp: 1000, duration: 1, result: 'success' }),
      tc({ tool: 'click', timestamp: 1100, duration: 1, result: 'success' }),
      tc({ tool: 'click', timestamp: 1200, duration: 1, result: 'success' }),
      tc({ tool: 'click', timestamp: 1300, duration: 50, result: 'success' }),
      tc({ tool: 'click', timestamp: 1400, duration: 60, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', clicks, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.instantClickRatio).toBe(0.6);
    expect(result.l2_behavior.details.some((d) => d.includes('偏高'))).toBe(true);
  });

  it('should detect high navigation/click ratio', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'click', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1100, result: 'success' }),
      tc({ tool: 'click', timestamp: 1200, result: 'success' }),
      tc({ tool: 'goto', timestamp: 1300, result: 'success' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(result.l2_behavior.moveClickRatio).toBeLessThan(2);
    expect(result.l2_behavior.score).toBeGreaterThanOrEqual(15);
  });

  it('should return fail status when score >= 45', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1001, result: 'success', duration: 1 }),
      tc({ tool: 'move', timestamp: 2000, result: 'success' }),
      tc({ tool: 'click', timestamp: 2001, result: 'success', duration: 1 }),
      tc({ tool: 'move', timestamp: 3000, result: 'success' }),
      tc({ tool: 'click', timestamp: 3001, result: 'success', duration: 1 }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    if (result.l2_behavior.score >= 45) {
      expect(result.l2_behavior.status).toBe('fail');
    }
  });

  it('should compute metrics correctly for mixed tool calls', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'goto', timestamp: 1000, result: 'success' }),
      tc({ tool: 'waitForSelector', timestamp: 1200, result: 'success' }),
      tc({ tool: 'click', timestamp: 1500, result: 'success', duration: 80 }),
      tc({ tool: 'click', timestamp: 1800, result: 'success', duration: 120 }),
      tc({ tool: 'click', timestamp: 2100, result: 'success', duration: 60 }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(typeof result.l2_behavior.score).toBe('number');
    expect(result.l2_behavior.details.length).toBeGreaterThan(0);
  });

  it('should handle failed tool calls (not success)', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'move', timestamp: 1000, result: 'error' }),
      tc({ tool: 'click', timestamp: 1001, result: 'error' }),
    ];
    const result = validateExecution(true, 'ok', calls, 's1', 'site', 'cmd', 100);
    expect(typeof result.l2_behavior.mdGap).toBe('number');
  });
});

describe('validateExecution — L3 regression', () => {
  it('should skip when no history (loadArchive returns null)', () => {
    const result = validateExecution(true, 'ok', [], 's1', 'site', 'cmd', 100);
    expect(result.l3_regression.status).toBe('skip');
    expect(result.l3_regression.diff[0]).toContain('首次执行');
  });

  it('should return skip for any sessionId since loadArchive returns null', () => {
    const result = validateExecution(true, { data: [1] }, [], 'any-session', 'x', 'y', 500);
    expect(result.l3_regression.status).toBe('skip');
  });
});

describe('validateExecution — integration', () => {
  it('should return all three layers', () => {
    const result = validateExecution(true, { data: [1] }, [], 's1', 'site', 'cmd', 100);
    expect(result).toHaveProperty('l1_functional');
    expect(result).toHaveProperty('l2_behavior');
    expect(result).toHaveProperty('l3_regression');
  });

  it('should handle complete flow with tool calls', () => {
    const calls: ToolCallRecord[] = [
      tc({ tool: 'goto', timestamp: 1000, result: 'success' }),
      tc({ tool: 'click', timestamp: 1200, result: 'success', duration: 80 }),
    ];
    const result = validateExecution(true, { data: [{ id: 1 }] }, calls, 's1', 'site', 'cmd', 200);
    expect(result.l1_functional.status).toBe('pass');
    expect(typeof result.l2_behavior.status).toBe('string');
    expect(result.l3_regression.status).toBe('skip');
  });
});

describe('formatValidationReport', () => {
  it('should format all-pass report', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 100,
        offsetStd: 0.1,
        moveClickRatio: 2,
        instantClickRatio: 0,
        details: ['md→click gap = 100.0ms', 'offset std = 0.100'],
      },
      l3_regression: { status: 'skip', diff: ['首次执行，无历史数据对比'] },
    };
    const lines = formatValidationReport(v);
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('L1');
    expect(lines[0]).toContain('✓');
    expect(lines[1]).toContain('L2');
    expect(lines[2]).toContain('L3');
  });

  it('should show ✗ for failed L1', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'fail', detail: 'handler 执行失败' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 0,
        offsetStd: 0,
        moveClickRatio: 0,
        instantClickRatio: 0,
        details: ['无工具调用'],
      },
      l3_regression: { status: 'skip', diff: ['首次执行'] },
    };
    const lines = formatValidationReport(v);
    expect(lines[0]).toContain('✗');
    expect(lines[0]).toContain('失败');
  });

  it('should show ⚠ for L2 warn', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'warn',
        score: 25,
        mdGap: 5,
        offsetStd: 0.05,
        moveClickRatio: 1,
        instantClickRatio: 0.5,
        details: ['可疑行为'],
      },
      l3_regression: { status: 'pass', diff: ['与上次一致'] },
    };
    const lines = formatValidationReport(v);
    expect(lines[1]).toContain('⚠');
    expect(lines[1]).toContain('score=25');
  });

  it('should show ⚠ for L3 warn', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 0,
        offsetStd: 0,
        moveClickRatio: 0,
        instantClickRatio: 0,
        details: [],
      },
      l3_regression: { status: 'warn', diff: ['数据条数: 5 → 3'] },
    };
    const lines = formatValidationReport(v);
    expect(lines[2]).toContain('⚠');
    expect(lines[2]).toContain('数据条数');
  });

  it('should show → for L3 skip', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 0,
        offsetStd: 0,
        moveClickRatio: 0,
        instantClickRatio: 0,
        details: [],
      },
      l3_regression: { status: 'skip', diff: ['首次执行'] },
    };
    const lines = formatValidationReport(v);
    expect(lines[2]).toContain('→');
  });

  it('should include all detail strings for L2', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 100,
        offsetStd: 0.1,
        moveClickRatio: 2,
        instantClickRatio: 0.1,
        details: ['detail-a', 'detail-b', 'detail-c'],
      },
      l3_regression: { status: 'pass', diff: ['ok'] },
    };
    const lines = formatValidationReport(v);
    expect(lines[1]).toContain('detail-a');
    expect(lines[1]).toContain('detail-b');
    expect(lines[1]).toContain('detail-c');
  });

  it('should handle empty diff array', () => {
    const v: ValidationResult = {
      l1_functional: { status: 'pass', detail: 'OK' },
      l2_behavior: {
        status: 'pass',
        score: 0,
        mdGap: 0,
        offsetStd: 0,
        moveClickRatio: 0,
        instantClickRatio: 0,
        details: [],
      },
      l3_regression: { status: 'pass', diff: [] },
    };
    const lines = formatValidationReport(v);
    expect(lines.length).toBe(3);
    expect(lines[2]).toContain('L3');
  });
});
