import { describe, it, expect } from 'vitest';
import { TipCollector, tip, normalizeTip, normalizeTips } from '../../src/tip.js';

describe('TipCollector', () => {
  it('collects info/warn/error tips', () => {
    const collector = new TipCollector();
    collector.info('开始采集');
    collector.warn('第3页失败', 'PAGINATION');
    collector.error('Token过期', 'AUTH');

    const tips = collector.collected;
    expect(tips).toHaveLength(3);
    expect(tips[0]).toEqual({ level: 'info', message: '开始采集' });
    expect(tips[1]).toEqual({ level: 'warn', message: '第3页失败', label: 'PAGINATION' });
    expect(tips[2]).toEqual({ level: 'error', message: 'Token过期', label: 'AUTH' });
  });

  it('starts empty', () => {
    const collector = new TipCollector();
    expect(collector.collected).toEqual([]);
  });

  it('preserves insertion order', () => {
    const collector = new TipCollector();
    collector.warn('warn1');
    collector.info('info1');
    collector.error('error1');
    collector.info('info2');

    const labels = collector.collected.map((t) => t.message);
    expect(labels).toEqual(['warn1', 'info1', 'error1', 'info2']);
  });
});

describe('tip helper', () => {
  it('creates info tip', () => {
    expect(tip.info('hello')).toEqual({ level: 'info', message: 'hello' });
  });

  it('creates warn tip with label', () => {
    expect(tip.warn('careful', 'DEPRECATED')).toEqual({
      level: 'warn',
      message: 'careful',
      label: 'DEPRECATED',
    });
  });

  it('creates error tip', () => {
    expect(tip.error('broken')).toEqual({ level: 'error', message: 'broken' });
  });
});

describe('normalizeTip', () => {
  it('passes through Tip objects unchanged', () => {
    const t = { level: 'warn' as const, message: 'hi', label: 'X' };
    expect(normalizeTip(t)).toBe(t);
  });

  it('converts string to info Tip', () => {
    expect(normalizeTip('hello')).toEqual({ level: 'info', message: 'hello' });
  });
});

describe('normalizeTips', () => {
  it('handles undefined', () => {
    expect(normalizeTips(undefined)).toEqual([]);
  });

  it('mixes strings and Tips', () => {
    const result = normalizeTips(['raw', { level: 'warn', message: 'structured' }]);
    expect(result).toEqual([
      { level: 'info', message: 'raw' },
      { level: 'warn', message: 'structured' },
    ]);
  });
});
