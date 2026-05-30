import { describe, it, expect } from 'vitest';
import { parseChain, executeChain, isOperator } from '../../src/chain.js';
import type { ParsedChain, ChainStepResult } from '../../src/chain.js';

describe('parseChain', () => {
  it('should parse single command into one step with no operator group', () => {
    const result = parseChain('click');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].steps).toEqual([{ command: 'click', args: [] }]);
  });

  it('should parse cmd1 && cmd2 into two steps with && operator', () => {
    const result = parseChain('cmd1 && cmd2');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].operator).toBe('&&');
    expect(result.groups[0].steps).toEqual([
      { command: 'cmd1', args: [] },
      { command: 'cmd2', args: [] },
    ]);
  });

  it('should parse cmd1 || cmd2 into two steps with || operator', () => {
    const result = parseChain('cmd1 || cmd2');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].operator).toBe('||');
    expect(result.groups[0].steps).toEqual([
      { command: 'cmd1', args: [] },
      { command: 'cmd2', args: [] },
    ]);
  });

  it('should parse cmd1 ; cmd2 into two steps with ; operator', () => {
    const result = parseChain('cmd1 ; cmd2');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].operator).toBe(';');
    expect(result.groups[0].steps).toEqual([
      { command: 'cmd1', args: [] },
      { command: 'cmd2', args: [] },
    ]);
  });

  it('should parse cmd1 , cmd2 , cmd3 into three steps with , operator', () => {
    const result = parseChain('cmd1 , cmd2 , cmd3');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].operator).toBe(',');
    expect(result.groups[0].steps).toEqual([
      { command: 'cmd1', args: [] },
      { command: 'cmd2', args: [] },
      { command: 'cmd3', args: [] },
    ]);
  });

  it('should handle quoted strings correctly', () => {
    const result = parseChain("fill '#input' \"hello world\" && click '#btn'");
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].operator).toBe('&&');
    expect(result.groups[0].steps).toEqual([
      { command: 'fill', args: ['#input', 'hello world'] },
      { command: 'click', args: ['#btn'] },
    ]);
  });

  it('should handle mixed operators', () => {
    const result = parseChain('cmd1 && cmd2 || cmd3');
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].operator).toBe('&&');
    expect(result.groups[0].steps).toEqual([
      { command: 'cmd1', args: [] },
      { command: 'cmd2', args: [] },
    ]);
    expect(result.groups[1].operator).toBe('||');
    expect(result.groups[1].steps).toEqual([{ command: 'cmd3', args: [] }]);
  });

  it('should return empty groups for empty string', () => {
    const result = parseChain('');
    expect(result.groups).toEqual([]);
  });

  it('should return empty groups for whitespace-only string', () => {
    const result = parseChain('   ');
    expect(result.groups).toEqual([]);
  });

  it('should parse command with multiple args', () => {
    const result = parseChain('goto https://example.com --wait 5000');
    expect(result.groups[0].steps[0]).toEqual({
      command: 'goto',
      args: ['https://example.com', '--wait', '5000'],
    });
  });
});

describe('executeChain', () => {
  it('should stop on first failure with && operator', async () => {
    const chain = parseChain('cmd1 && cmd2 && cmd3');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      if (cmd === 'cmd2') return { success: false, error: 'failed' };
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(false);
    expect(result.stoppedAt).toBe(1);
    expect(result.stoppedReason).toBe('AND operator: previous step failed');
    expect(callOrder).toEqual(['cmd1', 'cmd2']);
  });

  it('should continue on success with && operator', async () => {
    const chain = parseChain('cmd1 && cmd2');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(true);
    expect(callOrder).toEqual(['cmd1', 'cmd2']);
  });

  it('should stop on first success with || operator', async () => {
    const chain = parseChain('cmd1 || cmd2 || cmd3');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      if (cmd === 'cmd2') return { success: true };
      return { success: false, error: 'fail' };
    };

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(true);
    expect(result.stoppedAt).toBe(1);
    expect(result.stoppedReason).toBe('OR operator: previous step succeeded');
    expect(callOrder).toEqual(['cmd1', 'cmd2']);
  });

  it('should continue on failure with || operator', async () => {
    const chain = parseChain('cmd1 || cmd2');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      return { success: false, error: 'fail' };
    };

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(false);
    expect(callOrder).toEqual(['cmd1', 'cmd2']);
  });

  it('should always execute all steps with ; operator', async () => {
    const chain = parseChain('cmd1 ; cmd2 ; cmd3');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      if (cmd === 'cmd2') return { success: false, error: 'fail' };
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(callOrder).toEqual(['cmd1', 'cmd2', 'cmd3']);
    expect(result.success).toBe(false);
  });

  it('should execute steps in parallel with , operator', async () => {
    const chain = parseChain('cmd1 , cmd2 , cmd3');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      await new Promise((r) => setTimeout(r, 10));
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(result.steps).toHaveLength(3);
    expect(result.success).toBe(true);
  });

  it('should track duration per step', async () => {
    const chain = parseChain('cmd1 && cmd2');
    const executor = async (cmd: string) => {
      if (cmd === 'cmd1') await new Promise((r) => setTimeout(r, 30));
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(result.steps[0].duration).toBeGreaterThanOrEqual(20);
    expect(result.steps[1].duration).toBeLessThan(20);
    expect(result.totalDuration).toBeGreaterThanOrEqual(20);
  });

  it('should call onStep callback after each step', async () => {
    const chain = parseChain('cmd1 && cmd2');
    const stepResults: ChainStepResult[] = [];
    const executor = async (cmd: string) => ({ success: true });

    await executeChain(chain, executor, {
      onStep: (step) => stepResults.push(step),
    });

    expect(stepResults).toHaveLength(2);
    expect(stepResults[0].command).toBe('cmd1');
    expect(stepResults[1].command).toBe('cmd2');
  });

  it('should return success for empty chain', async () => {
    const chain: ParsedChain = { groups: [] };
    const executor = async () => ({ success: true });

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(true);
    expect(result.steps).toEqual([]);
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
  });

  it('should handle single command with no operators', async () => {
    const chain = parseChain('solo');
    const callOrder: string[] = [];
    const executor = async (cmd: string) => {
      callOrder.push(cmd);
      return { success: true };
    };

    const result = await executeChain(chain, executor);
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].command).toBe('solo');
    expect(callOrder).toEqual(['solo']);
  });
});

describe('isOperator', () => {
  it('should return true for valid operators', () => {
    expect(isOperator('&&')).toBe(true);
    expect(isOperator('||')).toBe(true);
    expect(isOperator(';')).toBe(true);
    expect(isOperator(',')).toBe(true);
  });

  it('should return false for non-operators', () => {
    expect(isOperator('&')).toBe(false);
    expect(isOperator('|')).toBe(false);
    expect(isOperator('cmd')).toBe(false);
    expect(isOperator('')).toBe(false);
  });
});
