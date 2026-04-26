import * as net from 'net';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface IPCResponse {
  success: boolean;
  content?: unknown;
  error?: string;
  tips?: string;
}

export function sendRequest(
  socketPath: string,
  data: unknown,
  timeout: number = 30000
): Promise<IPCResponse> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify(data) + '\n');
    });

    let response = '';
    client.on('data', (chunk) => {
      response += chunk.toString();
      if (response.includes('\n')) {
        client.end();
      }
    });

    client.on('end', () => {
      try {
        const lines = response.trim().split('\n');
        resolve(JSON.parse(lines[0]));
      } catch {
        reject(new Error('Invalid response'));
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.setTimeout(timeout, () => {
      client.destroy();
      reject(new Error('Timeout'));
    });
  });
}
