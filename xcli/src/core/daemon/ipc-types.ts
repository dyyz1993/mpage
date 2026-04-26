// eslint-disable-next-line @typescript-eslint/naming-convention -- IPC 前缀是项目约定，保持一致
export interface IPCMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  method: string;
  params: Record<string, unknown>;
  sessionId: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- IPC 前缀是项目约定，保持一致
export interface IPCResponse {
  id: string;
  type: 'response' | 'error';
  result?: unknown;
  error?: { code: string; message: string; tips: string[] };
}
