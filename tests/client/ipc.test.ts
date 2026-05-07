import { describe, it, expect, vi } from 'vitest';

vi.mock('net', () => {
  return {
    createConnection: vi.fn(),
  };
});

import { sendRequest } from '../../src/client/ipc.js';

function createMockSocket(eventHandlers: {
  onConnect?: () => void;
  onData?: (emit: (chunk: string) => void) => void;
  onEnd?: () => void;
  onError?: () => void;
  onSetTimeout?: () => void;
}) {
  let connectCb: (() => void) | null = null;
  const dataCbs: Array<(chunk: Buffer) => void> = [];
  let endCb: (() => void) | null = null;
  const errorCbs: Array<(err: Error) => void> = [];
  let timeoutCb: (() => void) | null = null;

  const socket = {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
    on(event: string, cb: unknown) {
      if (event === 'data') dataCbs.push(cb as (chunk: Buffer) => void);
      else if (event === 'end') endCb = cb as () => void;
      else if (event === 'error') errorCbs.push(cb as (err: Error) => void);
    },
    setTimeout(_ms: number, cb: () => void) {
      timeoutCb = cb;
    },
    unref: vi.fn(),
  };

  const createConnection = vi.fn((_path: string, cb: () => void) => {
    connectCb = cb;
    return socket;
  });

  return {
    createConnection,
    socket,
    simulateConnect() {
      if (connectCb) connectCb();
    },
    simulateData(chunk: string) {
      for (const cb of dataCbs) cb(Buffer.from(chunk));
    },
    simulateEnd() {
      if (endCb) endCb();
    },
    simulateError(err: Error) {
      for (const cb of errorCbs) cb(err);
    },
    simulateTimeout() {
      if (timeoutCb) timeoutCb();
    },
  };
}

describe('sendRequest', () => {
  it('should resolve with parsed JSON response', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    expect(mock.socket.write).toHaveBeenCalledWith(expect.stringContaining('"command"'));
    mock.simulateData('{"success":true,"content":"ok"}\n');
    mock.simulateEnd();

    const result = await promise;
    expect(result).toStrictEqual({ success: true, content: 'ok' });
  });

  it('should reject on connection error', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    mock.simulateError(new Error('ECONNREFUSED'));

    await expect(promise).rejects.toThrow('ECONNREFUSED');
  });

  it('should reject on timeout', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' }, 5000);
    mock.simulateConnect();
    mock.simulateTimeout();

    await expect(promise).rejects.toThrow('Timeout');
    expect(mock.socket.destroy).toHaveBeenCalled();
  });

  it('should reject on invalid JSON response', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    mock.simulateData('not valid json\n');
    mock.simulateEnd();

    await expect(promise).rejects.toThrow('Invalid response');
  });

  it('should handle multi-line response (parse first line)', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    mock.simulateData('{"success":true,"content":"first"}\n{"success":true}\n');
    mock.simulateEnd();

    const result = await promise;
    expect(result).toStrictEqual({ success: true, content: 'first' });
  });

  it('should handle chunked data across multiple events', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    mock.simulateData('{"suc');
    mock.simulateData('cess":true}\n');
    mock.simulateEnd();

    const result = await promise;
    expect(result).toStrictEqual({ success: true });
  });

  it('should send data with newline delimiter', async () => {
    const mock = createMockSocket({});
    const { createConnection } = await import('net');
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(mock.createConnection);

    const promise = sendRequest('/tmp/test.sock', { command: 'test' });
    mock.simulateConnect();
    const written = mock.socket.write.mock.calls[0][0] as string;
    expect(written.endsWith('\n')).toBe(true);
    expect(JSON.parse(written.trim())).toStrictEqual({ command: 'test' });

    mock.simulateData('{"success":true}\n');
    mock.simulateEnd();
    await promise;
  });
});
