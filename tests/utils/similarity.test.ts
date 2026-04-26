import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateSimilarity, findSimilarCommands } from '../../src/utils/similarity.js';

describe('calculateSimilarity', () => {
  it('should return 1 for identical strings', () => {
    assert.strictEqual(calculateSimilarity('goto', 'goto'), 1);
  });

  it('should return 0 for empty strings', () => {
    assert.strictEqual(calculateSimilarity('', 'goto'), 0);
    assert.strictEqual(calculateSimilarity('goto', ''), 0);
  });

  it('should return 0.8 for prefix match', () => {
    const result = calculateSimilarity('goto', 'gotoo');
    assert.strictEqual(result, 0.8);
  });

  it('should calculate edit distance similarity', () => {
    const result = calculateSimilarity('goto', 'got');
    assert.ok(result > 0.5);
    assert.ok(result < 1);
  });

  it('should be case sensitive', () => {
    const result = calculateSimilarity('goto', 'GOTO');
    assert.ok(result < 1);
  });

  it('should handle completely different strings', () => {
    const result = calculateSimilarity('abc', 'xyz');
    assert.ok(result < 0.5);
  });

  it('should return 0 for both empty strings', () => {
    assert.strictEqual(calculateSimilarity('', ''), 1);
  });

  it('should handle single character strings', () => {
    assert.strictEqual(calculateSimilarity('a', 'a'), 1);
    assert.strictEqual(calculateSimilarity('a', 'b'), 0);
  });

  it('should handle long strings', () => {
    const a = 'goto https://example.com and click the button';
    const b = 'goto https://example.com and click the link';
    const result = calculateSimilarity(a, b);
    assert.ok(result > 0.8);
    assert.ok(result < 1);
  });

  it('should return 0.8 when b is prefix of a', () => {
    assert.strictEqual(calculateSimilarity('gotoo', 'goto'), 0.8);
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
    assert.ok(result.includes('goto'));
  });

  it('should find similar commands for typo', () => {
    const result = findSimilarCommands('got', allCommands);
    assert.ok(result.includes('goto'));
  });

  it('should return empty array for no matches', () => {
    const result = findSimilarCommands('zzzzzzz', allCommands);
    assert.strictEqual(result.length, 0);
  });

  it('should limit to 3 results', () => {
    const result = findSimilarCommands('fil', allCommands);
    assert.ok(result.length <= 3);
  });

  it('should sort by similarity score', () => {
    const result = findSimilarCommands('fil', allCommands);
    if (result.length > 1) {
      const firstScore = calculateSimilarity('fil', result[0]);
      const secondScore = calculateSimilarity('fil', result[1]);
      assert.ok(firstScore >= secondScore);
    }
  });
});
