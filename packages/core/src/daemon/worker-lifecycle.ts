import { fork, type ChildProcess } from 'child_process';

export interface SpawnContext {
  onMessage: (msg: unknown) => void;
  onCrash: (sessionId: string) => void;
}

export async function spawnAndInitWorker(
  workerEntryPath: string,
  sessionId: string,
  ctx: SpawnContext
): Promise<ChildProcess> {
  const child = fork(workerEntryPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env },
  });

  child.on('message', (msg: unknown) => ctx.onMessage(msg));
  child.on('error', (err) => {
    console.error(`Worker ${sessionId} error:`, err.message);
    ctx.onCrash(sessionId);
  });
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker ${sessionId} exited with code ${code}`);
      ctx.onCrash(sessionId);
    }
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Worker ${sessionId} failed to start within timeout`));
    }, 15_000);

    const readyHandler = (msg: { type: string; event?: string; [key: string]: unknown }) => {
      if (msg.type === 'event' && msg.event === 'ready') {
        clearTimeout(timeout);
        child.off('message', readyHandler as (msg: unknown) => void);
        resolve();
      }
    };

    child.on('message', readyHandler as (msg: unknown) => void);
    child.send({ type: 'init', sessionId });
  });

  return child;
}

export async function killWorkerProcess(child: ChildProcess): Promise<void> {
  try {
    child.send({ type: 'shutdown' });
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 5_000);
      child.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  } catch {
    child.kill('SIGKILL');
  }
}
