import { describe, it, expect } from 'vitest';
import { BROWSER_SCOPE } from '../src/scope.js';

describe('BROWSER_SCOPE', () => {
  it('should have name "browser"', () => {
    expect(BROWSER_SCOPE.name).toBe('browser');
  });

  it('should have a description', () => {
    expect(BROWSER_SCOPE.description).toBeTruthy();
  });

  it('should define exactly 4 levels', () => {
    expect(BROWSER_SCOPE.levels).toHaveLength(4);
  });

  it('should have levels in order: project > browser > page > element', () => {
    const names = BROWSER_SCOPE.levels.map((l) => l.name);
    expect(names).toEqual(['project', 'browser', 'page', 'element']);
  });

  it('should have ascending order values', () => {
    const orders = BROWSER_SCOPE.levels.map((l) => l.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  it('each level should have a description', () => {
    for (const level of BROWSER_SCOPE.levels) {
      expect(level.description).toBeTruthy();
      expect(typeof level.description).toBe('string');
    }
  });

  it('project should be order 0', () => {
    expect(BROWSER_SCOPE.levels[0].name).toBe('project');
    expect(BROWSER_SCOPE.levels[0].order).toBe(0);
  });

  it('element should be order 3', () => {
    expect(BROWSER_SCOPE.levels[3].name).toBe('element');
    expect(BROWSER_SCOPE.levels[3].order).toBe(3);
  });

  it('should not have duplicate level names', () => {
    const names = BROWSER_SCOPE.levels.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
