import { describe, it, expect } from 'vitest';
import { executeCommand, executePipeline, executeCommandChain } from '../../src/client/executor.js';
import type { IPCResponse } from '../../src/client/ipc.js';

function mockSend(response: IPCResponse): (data: unknown) => Promise<IPCResponse> {
  return async () => response;
}

function mockSendSequence(responses: IPCResponse[]): (data: unknown) => Promise<IPCResponse> {
  let i = 0;
  return async () => {
    const r = responses[i];
    i++;
    return r;
  };
}

describe('executeCommand', () => {
  it('should return string content directly', async () => {
    const send = mockSend({ success: true, content: 'hello world' });
    const result = await executeCommand(send, 'echo', {});
    expect(result).toStrictEqual({ output: 'hello world', error: false, tips: undefined });
  });

  it('should extract url from object content', async () => {
    const send = mockSend({ success: true, content: { url: 'https://example.com' } });
    const result = await executeCommand(send, 'goto', {});
    expect(result.output).toBe('https://example.com');
    expect(result.error).toBe(false);
  });

  it('should extract title from object content', async () => {
    const send = mockSend({ success: true, content: { title: 'My Page' } });
    const result = await executeCommand(send, 'title', {});
    expect(result.output).toBe('My Page');
  });

  it('should extract text from object content', async () => {
    const send = mockSend({ success: true, content: { text: 'some text' } });
    const result = await executeCommand(send, 'text', {});
    expect(result.output).toBe('some text');
  });

  it('should extract html from object content', async () => {
    const send = mockSend({ success: true, content: { html: '<div>hi</div>' } });
    const result = await executeCommand(send, 'html', {});
    expect(result.output).toBe('<div>hi</div>');
  });

  it('should extract path from object content', async () => {
    const send = mockSend({ success: true, content: { path: '/foo/bar' } });
    const result = await executeCommand(send, 'screenshot', {});
    expect(result.output).toBe('/foo/bar');
  });

  it('should handle snapshot string', async () => {
    const send = mockSend({ success: true, content: { snapshot: 'accessibility tree' } });
    const result = await executeCommand(send, 'snapshot', {});
    expect(result.output).toBe('accessibility tree');
  });

  it('should handle snapshot object', async () => {
    const send = mockSend({ success: true, content: { snapshot: { nodes: [1, 2] } } });
    const result = await executeCommand(send, 'snapshot', {});
    expect(result.output).toBe(JSON.stringify({ nodes: [1, 2] }, null, 2));
  });

  it('should handle elements content', async () => {
    const send = mockSend({ success: true, content: { elements: [{ tag: 'div' }] } });
    const result = await executeCommand(send, 'find', {});
    expect(result.output).toBe(JSON.stringify([{ tag: 'div' }], null, 2));
  });

  it('should handle result content', async () => {
    const send = mockSend({ success: true, content: { result: [1, 2, 3] } });
    const result = await executeCommand(send, 'evaluate', {});
    expect(result.output).toBe(JSON.stringify([1, 2, 3], null, 2));
  });

  it('should handle structure content with yaml field', async () => {
    const send = mockSend({
      success: true,
      content: { structure: { type: 'page' }, yaml: '- page\n  - div' },
    });
    const result = await executeCommand(send, 'structure', {});
    expect(result.output).toBe('- page\n  - div');
  });

  it('should handle structure content without yaml (layoutToYaml)', async () => {
    const send = mockSend({
      success: true,
      content: {
        structure: {
          type: 'page',
          selector: 'html',
          children: [{ type: 'div', selector: '.container', hasForm: true }],
        },
      },
    });
    const result = await executeCommand(send, 'structure', {});
    expect(result.output).toContain('- page [html]');
    expect(result.output).toContain('- div [.container] {📝form}');
    expect(result.error).toBe(false);
  });

  it('should handle unknown object content as JSON', async () => {
    const send = mockSend({ success: true, content: { custom: 'value', num: 42 } });
    const result = await executeCommand(send, 'test', {});
    expect(result.output).toBe(JSON.stringify({ custom: 'value', num: 42 }, null, 2));
  });

  it('should handle null content', async () => {
    const send = mockSend({ success: true, content: null });
    const result = await executeCommand(send, 'test', {});
    expect(result.output).toBe('');
    expect(result.error).toBe(false);
  });

  it('should handle undefined content', async () => {
    const send = mockSend({ success: true });
    const result = await executeCommand(send, 'test', {});
    expect(result.output).toBe('');
  });

  it('should return JSON output in jsonMode', async () => {
    const send = mockSend({ success: true, content: 'hello', tips: ['tip1'] });
    const result = await executeCommand(send, 'test', {}, true);
    const parsed = JSON.parse(result.output);
    expect(parsed).toStrictEqual({ success: true, content: 'hello', tips: ['tip1'] });
    expect(result.error).toBe(false);
  });

  it('should handle error response', async () => {
    const send = mockSend({ success: false, error: 'Something went wrong' });
    const result = await executeCommand(send, 'test', {});
    expect(result.output).toBe('Something went wrong');
    expect(result.error).toBe(true);
  });

  it('should handle error response with tips', async () => {
    const send = mockSend({ success: false, error: 'fail', tips: ['hint'] });
    const result = await executeCommand(send, 'test', {});
    expect(result.error).toBe(true);
    expect(result.tips).toStrictEqual(['hint']);
  });

  it('should handle exception from sendRequest', async () => {
    const send = async () => {
      throw new Error('network failure');
    };
    const result = await executeCommand(send, 'test', {});
    expect(result.output).toBe('network failure');
    expect(result.error).toBe(true);
  });

  it('should handle tips in success response', async () => {
    const send = mockSend({ success: true, content: 'ok', tips: ['did something'] });
    const result = await executeCommand(send, 'test', {});
    expect(result.tips).toStrictEqual(['did something']);
  });
});

describe('executePipeline', () => {
  it('should execute single command successfully', async () => {
    const send = mockSend({ success: true, content: 'ok' });
    const result = await executePipeline(send, ["goto 'https://example.com'"]);
    expect(result.error).toBe(false);
    expect(result.output).toBe('ok');
  });

  it('should execute multi-command pipeline', async () => {
    const send = mockSendSequence([
      { success: true, content: 'navigated' },
      { success: true, content: 'clicked' },
    ]);
    const result = await executePipeline(send, ["goto 'https://example.com'", "click '#btn'"]);
    expect(result.error).toBe(false);
    expect(result.output).toBe('clicked');
  });

  it('should return error for unknown command', async () => {
    const send = mockSend({ success: true, content: 'ok' });
    const result = await executePipeline(send, ['unknowncmd']);
    expect(result.error).toBe(true);
    expect(result.output).toContain('Unknown command');
  });

  it('should stop pipeline on command failure', async () => {
    const send = mockSendSequence([
      { success: false, error: 'navigation failed' },
      { success: true, content: 'should not reach' },
    ]);
    const result = await executePipeline(send, ["goto 'https://fail.com'", "click '#btn'"]);
    expect(result.error).toBe(true);
    expect(result.output).toBe('navigation failed');
  });

  it('should accumulate tips across pipeline steps', async () => {
    const send = mockSendSequence([
      { success: true, content: 'step1', tips: ['tip1'] },
      { success: true, content: 'step2', tips: ['tip2'] },
    ]);
    const result = await executePipeline(send, ["goto 'https://example.com'", "click '#btn'"]);
    expect(result.tips).toStrictEqual(['tip2']);
  });
});

describe('executeCommandChain', () => {
  it('should execute single pipeline', async () => {
    const send = mockSend({ success: true, content: 'done' });
    const result = await executeCommandChain(send, "goto 'https://example.com'");
    expect(result.error).toBe(false);
    expect(result.output).toBe('done');
  });

  it('should skip and-pipeline after error', async () => {
    const send = mockSendSequence([
      { success: false, error: 'failed' },
      { success: true, content: 'should skip' },
    ]);
    const result = await executeCommandChain(send, "goto 'https://fail.com' && click '#btn'");
    expect(result.error).toBe(true);
    expect(result.output).toBe('failed');
  });

  it('should handle multiple pipelines separated by semicolons', async () => {
    const send = mockSendSequence([
      { success: true, content: 'step1' },
      { success: true, content: 'step2' },
    ]);
    const result = await executeCommandChain(send, "goto 'https://a.com' ; goto 'https://b.com'");
    expect(result.error).toBe(false);
    expect(result.output).toBe('step2');
  });

  it('should skip and-pipeline after semicolon if previous failed', async () => {
    const send = mockSendSequence([
      { success: false, error: 'failed' },
      { success: true, content: 'should skip' },
    ]);
    const result = await executeCommandChain(
      send,
      "goto 'https://fail.com' ; goto 'https://ok.com'"
    );
    expect(result.error).toBe(true);
    expect(result.output).toBe('failed');
  });

  it('should handle empty input', async () => {
    const send = mockSend({ success: true, content: 'ok' });
    const result = await executeCommandChain(send, '');
    expect(result.output).toBe('');
    expect(result.error).toBe(false);
  });
});
