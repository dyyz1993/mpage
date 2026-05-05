import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sendRequest } from '../../src/client/ipc.js';

const tmpDir = path.join(os.tmpdir(), 'mpage-test-ipc');
let serverSocketPath: string;
let server: net.Server;
let serverCleanup: (() => void) | null = null;

function createServer(
  socketPath: string,
  handler: (data: unknown) => { response: unknown; delay?: number }
): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(socketPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);

    const srv = net.createServer((socket) => {
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('\n')) {
          const lines = buffer.trim().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const { response, delay } = handler(parsed);
              const send = () => {
                socket.write(JSON.stringify(response) + '\n');
              };
              if (delay) {
                setTimeout(send, delay);
              } else {
                send();
              }
            } catch {
              socket.write(JSON.stringify({ success: false, error: 'Invalid request' }) + '\n');
            }
          }
        }
      });
    });

    srv.listen(socketPath, () => resolve(srv));
    srv.on('error', reject);
  });
}

describe('sendRequest', () => {
  beforeEach(async () => {
    serverSocketPath = path.join(tmpDir, `test-${Date.now()}.sock`);
    server = await createServer(serverSocketPath, ({ response }) => ({ response }));
    serverCleanup = () => {
      server.close();
      if (fs.existsSync(serverSocketPath)) fs.unlinkSync(serverSocketPath);
    };
  });

  afterEach(() => {
    serverCleanup?.();
    serverCleanup = null;
  });

  it('should send data and receive JSON response', async () => {
    server.close();
    server = await createServer(serverSocketPath, (data) => ({
      response: { success: true, content: { echo: data } },
    }));

    const result = await sendRequest(serverSocketPath, {
      command: 'goto',
      args: { url: 'https://example.com' },
    });

    expect(result.success).toBe(true);
    const content = result.content as { echo: { command: string; args: { url: string } } };
    expect(content.echo.command).toBe('goto');
    expect(content.echo.args.url).toBe('https://example.com');
  });

  it('should handle success:false response', async () => {
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: false, error: 'Element not found' },
    }));

    const result = await sendRequest(serverSocketPath, { command: 'click' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Element not found');
  });

  it('should handle connection error', async () => {
    server.close();
    const nonexistentSocket = path.join(tmpDir, 'nonexistent.sock');

    await expect(sendRequest(nonexistentSocket, { command: 'test' })).rejects.toThrow();
  });

  it('should handle timeout', async () => {
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: true },
      delay: 5000,
    }));

    await expect(sendRequest(serverSocketPath, { command: 'test' }, 200)).rejects.toThrow(
      'Timeout'
    );
  });

  it('should use default timeout of 30000', async () => {
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: true, content: 'fast' },
    }));

    const start = Date.now();
    const result = await sendRequest(serverSocketPath, { command: 'test' });
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed < 30000).toBeTruthy();
  });

  it('should handle response with tips', async () => {
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: true, content: 'ok', tips: 'Try --force' },
    }));

    const result = await sendRequest(serverSocketPath, { command: 'click' });

    expect(result.success).toBe(true);
    expect(result.tips).toBe('Try --force');
  });

  it('should handle large response', async () => {
    const largeContent = 'x'.repeat(100000);
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: true, content: largeContent },
    }));

    const result = await sendRequest(serverSocketPath, { command: 'test' });

    expect(result.success).toBe(true);
    expect(result.content).toBe(largeContent);
  });

  it('should handle response with null content', async () => {
    server.close();
    server = await createServer(serverSocketPath, () => ({
      response: { success: true, content: null },
    }));

    const result = await sendRequest(serverSocketPath, { command: 'wait' });

    expect(result.success).toBe(true);
    expect(result.content).toBe(null);
  });
});
