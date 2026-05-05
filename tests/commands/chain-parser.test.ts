import { describe, it, expect } from 'vitest';
import { parseCommandChain, splitCommand } from '../../src/commands/chain-parser.js';

describe('parseCommandChain', () => {
  it('should parse single command', () => {
    const result = parseCommandChain('goto https://example.com');
    expect(result.length).toBe(1);
    expect(result[0].pipeline.length).toBe(1);
    expect(result[0].pipeline[0]).toBe('goto https://example.com');
    expect(result[0].type).toBe('and');
  });

  it('should parse && chain', () => {
    const result = parseCommandChain("goto baidu.com && fill '#kw' 'hello'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline.length).toBe(2);
    expect(result[0].pipeline[0]).toBe('goto baidu.com');
    expect(result[0].pipeline[1]).toBe("fill '#kw' 'hello'");
    expect(result[0].type).toBe('and');
  });

  it('should parse ; chain', () => {
    const result = parseCommandChain('goto baidu.com; screenshot');
    expect(result.length).toBe(2);
    expect(result[0].pipeline[0]).toBe('goto baidu.com');
    expect(result[0].type).toBe('sequence');
    expect(result[1].pipeline[0]).toBe('screenshot');
    expect(result[1].type).toBe('and');
  });

  it('should handle quoted strings in && chain', () => {
    const result = parseCommandChain("goto 'https://example.com' && fill \"#input\" 'hello world'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline.length).toBe(2);
    expect(result[0].pipeline[0]).toBe("goto 'https://example.com'");
    expect(result[0].pipeline[1]).toBe('fill "#input" \'hello world\'');
  });

  it('should handle mixed && and ;', () => {
    const result = parseCommandChain('goto baidu.com && title; screenshot');
    expect(result.length).toBe(2);
    expect(result[0].pipeline.length).toBe(2);
    expect(result[0].type).toBe('sequence');
    expect(result[1].pipeline.length).toBe(1);
    expect(result[1].type).toBe('and');
  });

  it('should handle empty input', () => {
    const result = parseCommandChain('');
    expect(result.length).toBe(0);
  });

  it('should handle parentheses', () => {
    const result = parseCommandChain("evaluate '(function() { return 1; })()'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe("evaluate '(function() { return 1; })()'");
  });

  it('should handle nested parentheses', () => {
    const result = parseCommandChain("evaluate '(function() { return (1 + 2); })()'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe("evaluate '(function() { return (1 + 2); })()'");
  });

  it('should handle && inside parentheses as literal', () => {
    const result = parseCommandChain("evaluate 'a && b'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe("evaluate 'a && b'");
  });

  it('should handle ; inside quotes as literal', () => {
    const result = parseCommandChain("fill '#input' 'hello;world'");
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe("fill '#input' 'hello;world'");
  });

  it('should handle trailing semicolon', () => {
    const result = parseCommandChain('goto baidu.com;');
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe('goto baidu.com');
    expect(result[0].type).toBe('sequence');
  });

  it('should handle leading semicolon', () => {
    const result = parseCommandChain(';goto baidu.com');
    expect(result.length).toBe(1);
    expect(result[0].pipeline[0]).toBe('goto baidu.com');
  });

  it('should handle multiple && commands', () => {
    const result = parseCommandChain('a && b && c && d');
    expect(result.length).toBe(1);
    expect(result[0].pipeline.length).toBe(4);
    expect(result[0].type).toBe('and');
  });

  it('should handle whitespace-only input', () => {
    const result = parseCommandChain('   ');
    expect(result.length).toBe(0);
  });
});

describe('splitCommand', () => {
  it('should split simple command', () => {
    const result = splitCommand('goto https://example.com');
    expect(result).toStrictEqual(['goto', 'https://example.com']);
  });

  it('should handle single quotes', () => {
    const result = splitCommand("fill '#kw' 'hello world'");
    expect(result).toStrictEqual(['fill', "'#kw'", "'hello world'"]);
  });

  it('should handle double quotes', () => {
    const result = splitCommand('fill "#kw" "hello world"');
    expect(result).toStrictEqual(['fill', '"#kw"', '"hello world"']);
  });

  it('should handle mixed quotes', () => {
    const result = splitCommand('fill \'#kw\' "hello world"');
    expect(result).toStrictEqual(['fill', "'#kw'", '"hello world"']);
  });

  it('should handle multiple spaces', () => {
    const result = splitCommand('goto   https://example.com');
    expect(result).toStrictEqual(['goto', 'https://example.com']);
  });

  it('should handle empty string', () => {
    const result = splitCommand('');
    expect(result).toStrictEqual([]);
  });

  it('should handle command with flags', () => {
    const result = splitCommand('goto https://example.com --timeout 5000');
    expect(result).toStrictEqual(['goto', 'https://example.com', '--timeout', '5000']);
  });
});
