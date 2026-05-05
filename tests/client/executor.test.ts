import { describe, it, expect, vi } from 'vitest';
import { executeCommand, executePipeline, executeCommandChain } from '../../src/client/executor.js';
import type { IPCResponse } from '../../src/client/ipc.js';

function createMockSendRequest(responses: IPCResponse[]) {
  let callIndex = 0;
  return vi.fn((_data: unknown): Promise<IPCResponse> => {
    const response = responses[callIndex] || { success: false, error: 'No more responses' };
    callIndex++;
    return response;
  });
}

describe('executeCommand', () => {
  it('should return output for successful string response', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'Hello World' }]);
    const result = await executeCommand(mockSend, 'text', { selector: 'body' });

    expect(result.output).toBe('Hello World');
    expect(result.error).toBe(false);
    expect(mockSend.mock.calls.length).toBe(1);
    expect(mockSend.mock.calls[0][0]).toStrictEqual({
      command: 'text',
      args: { selector: 'body' },
    });
  });

  it('should return error for failed response', async () => {
    const mockSend = createMockSendRequest([{ success: false, error: 'Element not found' }]);
    const result = await executeCommand(mockSend, 'click', { selector: '#missing' });

    expect(result.output).toBe('Element not found');
    expect(result.error).toBe(true);
  });

  it('should extract url from content object', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { url: 'https://example.com' } },
    ]);
    const result = await executeCommand(mockSend, 'url', {});

    expect(result.output).toBe('https://example.com');
    expect(result.error).toBe(false);
  });

  it('should extract title from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { title: 'Test Page' } }]);
    const result = await executeCommand(mockSend, 'title', {});

    expect(result.output).toBe('Test Page');
  });

  it('should extract text from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { text: 'body content' } }]);
    const result = await executeCommand(mockSend, 'text', {});

    expect(result.output).toBe('body content');
  });

  it('should extract html from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { html: '<div>hi</div>' } }]);
    const result = await executeCommand(mockSend, 'html', {});

    expect(result.output).toBe('<div>hi</div>');
  });

  it('should extract path from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { path: '/tmp/shot.png' } }]);
    const result = await executeCommand(mockSend, 'screenshot', {});

    expect(result.output).toBe('/tmp/shot.png');
  });

  it('should handle snapshot string content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { snapshot: '- heading "Hello"' } },
    ]);
    const result = await executeCommand(mockSend, 'snapshot', {});

    expect(result.output).toBe('- heading "Hello"');
  });

  it('should handle snapshot object content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { snapshot: { nodes: ['a'] } } },
    ]);
    const result = await executeCommand(mockSend, 'snapshot', {});

    expect(result.output.includes('nodes')).toBeTruthy();
  });

  it('should handle elements content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { elements: [{ tag: 'div' }] } },
    ]);
    const result = await executeCommand(mockSend, 'query', { selector: 'div' });

    expect(result.output.includes('div')).toBeTruthy();
  });

  it('should handle result content', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { result: 42 } }]);
    const result = await executeCommand(mockSend, 'evaluate', { expression: '1+1' });

    expect(result.output).toBe('42');
  });

  it('should return JSON in jsonMode', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'text', tips: 'some tip' }]);
    const result = await executeCommand(mockSend, 'text', {}, true);

    const parsed = JSON.parse(result.output);
    expect(parsed).toStrictEqual({ success: true, content: 'text', tips: 'some tip' });
  });

  it('should propagate exception as error', async () => {
    const mockSend = vi.fn(() => {
      throw new Error('Connection refused');
    });
    const result = await executeCommand(mockSend, 'goto', { url: 'https://example.com' });

    expect(result.output).toBe('Connection refused');
    expect(result.error).toBe(true);
  });

  it('should include tips from response', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: 'ok', tips: 'Try using --force' },
    ]);
    const result = await executeCommand(mockSend, 'click', { selector: '#btn' });

    expect(result.tips).toBe('Try using --force');
  });

  it('should handle null/undefined content', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: null }]);
    const result = await executeCommand(mockSend, 'wait', { timeout: 1000 });

    expect(result.output).toBe('');
    expect(result.error).toBe(false);
  });

  it('should return Unknown error for failed response without error message', async () => {
    const mockSend = createMockSendRequest([{ success: false }]);
    const result = await executeCommand(mockSend, 'test', {});

    expect(result.output).toBe('Unknown error');
    expect(result.error).toBe(true);
  });
});

describe('executePipeline', () => {
  it('should execute single command', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'done' }]);
    const result = await executePipeline(mockSend, ['text body']);

    expect(result.output).toBe('done');
    expect(result.error).toBe(false);
  });

  it('should stop on error', async () => {
    const mockSend = createMockSendRequest([
      { success: false, error: 'Failed' },
      { success: true, content: 'should not reach' },
    ]);
    const result = await executePipeline(mockSend, ['click #missing', 'text body']);

    expect(result.output).toBe('Failed');
    expect(result.error).toBe(true);
    expect(mockSend.mock.calls.length).toBe(1);
  });

  it('should return suggestion for unknown command', async () => {
    const mockSend = createMockSendRequest([]);
    const result = await executePipeline(mockSend, ['gotu https://example.com']);

    expect(result.error).toBe(true);
    expect(result.output.includes('Unknown command: gotu')).toBeTruthy();
  });

  it('should return error for invalid args', async () => {
    const mockSend = createMockSendRequest([]);
    const result = await executePipeline(mockSend, ['goto']);

    expect(result.error).toBe(true);
    expect(result.output.includes('Invalid args')).toBeTruthy();
  });
});

describe('executeCommandChain', () => {
  it('should execute simple command', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { title: 'Hello' } }]);
    const result = await executeCommandChain(mockSend, 'title');

    expect(result.output).toBe('Hello');
    expect(result.error).toBe(false);
  });

  it('should skip and-chain after error', async () => {
    const mockSend = createMockSendRequest([
      { success: false, error: 'fail' },
      { success: true, content: { title: 'Skipped' } },
    ]);
    const result = await executeCommandChain(mockSend, 'click #missing && title');

    expect(result.error).toBe(true);
    expect(mockSend.mock.calls.length).toBe(1);
  });

  it('should execute semicolon-separated commands sequentially', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { url: 'https://example.com' } },
      { success: true, content: { title: 'Example' } },
    ]);
    const result = await executeCommandChain(mockSend, 'url; title');

    expect(result.output).toBe('Example');
    expect(result.error).toBe(false);
    expect(mockSend.mock.calls.length).toBe(2);
  });

  it('should accumulate tips across commands', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: 'first', tips: 'tip1' },
      { success: true, content: 'second', tips: 'tip2' },
    ]);
    const result = await executeCommandChain(mockSend, 'url; title');

    expect(result.tips).toBe('tip2');
  });
});
