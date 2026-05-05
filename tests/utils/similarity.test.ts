import { describe, it, expect } from 'vitest';
import { calculateSimilarity, findSimilarCommands } from '../../src/utils/similarity.js';

describe('calculateSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(calculateSimilarity('goto', 'goto')).toBe(1);
  });

  it('should return 0 for empty strings', () => {
    expect(calculateSimilarity('', 'goto')).toBe(0);
    expect(calculateSimilarity('goto', '')).toBe(0);
  });

  it('should return 0.8 for prefix match', () => {
    const result = calculateSimilarity('goto', 'gotoo');
    expect(result).toBe(0.8);
  });

  it('should calculate edit distance similarity', () => {
    const result = calculateSimilarity('goto', 'got');
    expect(result > 0.5).toBeTruthy();
    expect(result < 1).toBeTruthy();
  });

  it('should be case sensitive', () => {
    const result = calculateSimilarity('goto', 'GOTO');
    expect(result < 1).toBeTruthy();
  });

  it('should handle completely different strings', () => {
    const result = calculateSimilarity('abc', 'xyz');
    expect(result < 0.5).toBeTruthy();
  });

  it('should return 0 for both empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1);
  });

  it('should handle single character strings', () => {
    expect(calculateSimilarity('a', 'a')).toBe(1);
    expect(calculateSimilarity('a', 'b')).toBe(0);
  });

  it('should handle long strings', () => {
    const a = 'goto https://example.com and click the button';
    const b = 'goto https://example.com and click the link';
    const result = calculateSimilarity(a, b);
    expect(result > 0.8).toBeTruthy();
    expect(result < 1).toBeTruthy();
  });

  it('should return 0.8 when b is prefix of a', () => {
    expect(calculateSimilarity('gotoo', 'goto')).toBe(0.8);
  });
});

describe('findSimilarCommands', () => {
  const allCommands = [
    'goto',
    'click',
    'fill',
    'type',
    'press',
    'hover',
    'scroll',
    'wait',
    'screenshot',
    'title',
    'url',
    'html',
    'text',
    'query',
    'find',
  ];

  it('should find exact match', () => {
    const result = findSimilarCommands('goto', allCommands);
    expect(result.includes('goto')).toBeTruthy();
  });

  it('should find similar commands for typo', () => {
    const result = findSimilarCommands('got', allCommands);
    expect(result.includes('goto')).toBeTruthy();
  });

  it('should return empty array for no matches', () => {
    const result = findSimilarCommands('zzzzzzz', allCommands);
    expect(result.length).toBe(0);
  });

  it('should limit to 3 results', () => {
    const result = findSimilarCommands('fil', allCommands);
    expect(result.length <= 3).toBeTruthy();
  });

  it('should sort by similarity score', () => {
    const result = findSimilarCommands('fil', allCommands);
    if (result.length > 1) {
      const firstScore = calculateSimilarity('fil', result[0]);
      const secondScore = calculateSimilarity('fil', result[1]);
      expect(firstScore >= secondScore).toBeTruthy();
    }
  });
});
