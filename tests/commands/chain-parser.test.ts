import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCommandChain, splitCommand } from '../../src/commands/chain-parser.js';

describe('parseCommandChain', () => {
  it('should parse single command', () => {
    const result = parseCommandChain('goto https://example.com');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].pipeline.length, 1);
    assert.strictEqual(result[0].pipeline[0], 'goto https://example.com');
    assert.strictEqual(result[0].type, 'and');
  });

  it('should parse && chain', () => {
    const result = parseCommandChain("goto baidu.com && fill '#kw' 'hello'");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].pipeline.length, 2);
    assert.strictEqual(result[0].pipeline[0], 'goto baidu.com');
    assert.strictEqual(result[0].pipeline[1], "fill '#kw' 'hello'");
    assert.strictEqual(result[0].type, 'and');
  });

  it('should parse ; chain', () => {
    const result = parseCommandChain('goto baidu.com; screenshot');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].pipeline[0], 'goto baidu.com');
    assert.strictEqual(result[0].type, 'sequence');
    assert.strictEqual(result[1].pipeline[0], 'screenshot');
    assert.strictEqual(result[1].type, 'and');
  });

  it('should handle quoted strings in && chain', () => {
    const result = parseCommandChain("goto 'https://example.com' && fill \"#input\" 'hello world'");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].pipeline.length, 2);
    assert.strictEqual(result[0].pipeline[0], "goto 'https://example.com'");
    assert.strictEqual(result[0].pipeline[1], 'fill "#input" \'hello world\'');
  });

  it('should handle mixed && and ;', () => {
    const result = parseCommandChain('goto baidu.com && title; screenshot');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].pipeline.length, 2);
    assert.strictEqual(result[0].type, 'sequence');
    assert.strictEqual(result[1].pipeline.length, 1);
    assert.strictEqual(result[1].type, 'and');
  });

  it('should handle empty input', () => {
    const result = parseCommandChain('');
    assert.strictEqual(result.length, 0);
  });

  it('should handle parentheses', () => {
    const result = parseCommandChain("evaluate '(function() { return 1; })()'");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].pipeline[0], "evaluate '(function() { return 1; })()'");
  });
});

describe('splitCommand', () => {
  it('should split simple command', () => {
    const result = splitCommand('goto https://example.com');
    assert.deepStrictEqual(result, ['goto', 'https://example.com']);
  });

  it('should handle single quotes', () => {
    const result = splitCommand("fill '#kw' 'hello world'");
    assert.deepStrictEqual(result, ['fill', "'#kw'", "'hello world'"]);
  });

  it('should handle double quotes', () => {
    const result = splitCommand('fill "#kw" "hello world"');
    assert.deepStrictEqual(result, ['fill', '"#kw"', '"hello world"']);
  });

  it('should handle mixed quotes', () => {
    const result = splitCommand('fill \'#kw\' "hello world"');
    assert.deepStrictEqual(result, ['fill', "'#kw'", '"hello world"']);
  });

  it('should handle multiple spaces', () => {
    const result = splitCommand('goto   https://example.com');
    assert.deepStrictEqual(result, ['goto', 'https://example.com']);
  });

  it('should handle empty string', () => {
    const result = splitCommand('');
    assert.deepStrictEqual(result, []);
  });

  it('should handle command with flags', () => {
    const result = splitCommand('goto https://example.com --timeout 5000');
    assert.deepStrictEqual(result, ['goto', 'https://example.com', '--timeout', '5000']);
  });
});
