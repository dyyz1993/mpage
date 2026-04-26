import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { executeCommand, executePipeline, executeCommandChain } from '../../src/client/executor.js';
import type { IPCResponse } from '../../src/client/ipc.js';

function createMockSendRequest(responses: IPCResponse[]) {
  let callIndex = 0;
  // eslint-disable-next-line require-await
  return mock.fn(async (_data: unknown): Promise<IPCResponse> => {
    const response = responses[callIndex] || { success: false, error: 'No more responses' };
    callIndex++;
    return response;
  });
}

describe('executeCommand', () => {
  it('should return output for successful string response', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'Hello World' }]);
    const result = await executeCommand(mockSend, 'text', { selector: 'body' });

    assert.strictEqual(result.output, 'Hello World');
    assert.strictEqual(result.error, false);
    assert.strictEqual(mockSend.mock.calls.length, 1);
    assert.deepStrictEqual(mockSend.mock.calls[0].arguments[0], {
      command: 'text',
      args: { selector: 'body' },
    });
  });

  it('should return error for failed response', async () => {
    const mockSend = createMockSendRequest([{ success: false, error: 'Element not found' }]);
    const result = await executeCommand(mockSend, 'click', { selector: '#missing' });

    assert.strictEqual(result.output, 'Element not found');
    assert.strictEqual(result.error, true);
  });

  it('should extract url from content object', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { url: 'https://example.com' } },
    ]);
    const result = await executeCommand(mockSend, 'url', {});

    assert.strictEqual(result.output, 'https://example.com');
    assert.strictEqual(result.error, false);
  });

  it('should extract title from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { title: 'Test Page' } }]);
    const result = await executeCommand(mockSend, 'title', {});

    assert.strictEqual(result.output, 'Test Page');
  });

  it('should extract text from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { text: 'body content' } }]);
    const result = await executeCommand(mockSend, 'text', {});

    assert.strictEqual(result.output, 'body content');
  });

  it('should extract html from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { html: '<div>hi</div>' } }]);
    const result = await executeCommand(mockSend, 'html', {});

    assert.strictEqual(result.output, '<div>hi</div>');
  });

  it('should extract path from content object', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { path: '/tmp/shot.png' } }]);
    const result = await executeCommand(mockSend, 'screenshot', {});

    assert.strictEqual(result.output, '/tmp/shot.png');
  });

  it('should handle snapshot string content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { snapshot: '- heading "Hello"' } },
    ]);
    const result = await executeCommand(mockSend, 'snapshot', {});

    assert.strictEqual(result.output, '- heading "Hello"');
  });

  it('should handle snapshot object content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { snapshot: { nodes: ['a'] } } },
    ]);
    const result = await executeCommand(mockSend, 'snapshot', {});

    assert.ok(result.output.includes('nodes'));
  });

  it('should handle elements content', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { elements: [{ tag: 'div' }] } },
    ]);
    const result = await executeCommand(mockSend, 'query', { selector: 'div' });

    assert.ok(result.output.includes('div'));
  });

  it('should handle result content', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { result: 42 } }]);
    const result = await executeCommand(mockSend, 'evaluate', { expression: '1+1' });

    assert.strictEqual(result.output, '42');
  });

  it('should return JSON in jsonMode', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'text', tips: 'some tip' }]);
    const result = await executeCommand(mockSend, 'text', {}, true);

    const parsed = JSON.parse(result.output);
    assert.deepStrictEqual(parsed, { success: true, content: 'text', tips: 'some tip' });
  });

  it('should propagate exception as error', async () => {
    // eslint-disable-next-line require-await
    const mockSend = mock.fn(async () => {
      throw new Error('Connection refused');
    });
    const result = await executeCommand(mockSend, 'goto', { url: 'https://example.com' });

    assert.strictEqual(result.output, 'Connection refused');
    assert.strictEqual(result.error, true);
  });

  it('should include tips from response', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: 'ok', tips: 'Try using --force' },
    ]);
    const result = await executeCommand(mockSend, 'click', { selector: '#btn' });

    assert.strictEqual(result.tips, 'Try using --force');
  });

  it('should handle null/undefined content', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: null }]);
    const result = await executeCommand(mockSend, 'wait', { timeout: 1000 });

    assert.strictEqual(result.output, '');
    assert.strictEqual(result.error, false);
  });

  it('should return Unknown error for failed response without error message', async () => {
    const mockSend = createMockSendRequest([{ success: false }]);
    const result = await executeCommand(mockSend, 'test', {});

    assert.strictEqual(result.output, 'Unknown error');
    assert.strictEqual(result.error, true);
  });
});

describe('executePipeline', () => {
  it('should execute single command', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: 'done' }]);
    const result = await executePipeline(mockSend, ['text body']);

    assert.strictEqual(result.output, 'done');
    assert.strictEqual(result.error, false);
  });

  it('should stop on error', async () => {
    const mockSend = createMockSendRequest([
      { success: false, error: 'Failed' },
      { success: true, content: 'should not reach' },
    ]);
    const result = await executePipeline(mockSend, ['click #missing', 'text body']);

    assert.strictEqual(result.output, 'Failed');
    assert.strictEqual(result.error, true);
    assert.strictEqual(mockSend.mock.calls.length, 1);
  });

  it('should return suggestion for unknown command', async () => {
    const mockSend = createMockSendRequest([]);
    const result = await executePipeline(mockSend, ['gotu https://example.com']);

    assert.strictEqual(result.error, true);
    assert.ok(result.output.includes('Unknown command: gotu'));
    assert.ok(result.tips?.includes('goto'));
  });

  it('should return error for invalid args', async () => {
    const mockSend = createMockSendRequest([]);
    const result = await executePipeline(mockSend, ['goto']);

    assert.strictEqual(result.error, true);
    assert.ok(result.output.includes('Invalid args'));
  });
});

describe('executeCommandChain', () => {
  it('should execute simple command', async () => {
    const mockSend = createMockSendRequest([{ success: true, content: { title: 'Hello' } }]);
    const result = await executeCommandChain(mockSend, 'title');

    assert.strictEqual(result.output, 'Hello');
    assert.strictEqual(result.error, false);
  });

  it('should skip and-chain after error', async () => {
    const mockSend = createMockSendRequest([
      { success: false, error: 'fail' },
      { success: true, content: { title: 'Skipped' } },
    ]);
    const result = await executeCommandChain(mockSend, 'click #missing && title');

    assert.strictEqual(result.error, true);
    assert.strictEqual(mockSend.mock.calls.length, 1);
  });

  it('should execute semicolon-separated commands sequentially', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: { url: 'https://example.com' } },
      { success: true, content: { title: 'Example' } },
    ]);
    const result = await executeCommandChain(mockSend, 'url; title');

    assert.strictEqual(result.output, 'Example');
    assert.strictEqual(result.error, false);
    assert.strictEqual(mockSend.mock.calls.length, 2);
  });

  it('should accumulate tips across commands', async () => {
    const mockSend = createMockSendRequest([
      { success: true, content: 'first', tips: 'tip1' },
      { success: true, content: 'second', tips: 'tip2' },
    ]);
    const result = await executeCommandChain(mockSend, 'url; title');

    assert.strictEqual(result.tips, 'tip2');
  });
});
