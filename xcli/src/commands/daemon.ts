import { startDaemon, isDaemonRunning, stopDaemon } from '../core/daemon-manager';

export async function daemonCommand(args: string[], _values: Record<string, any>) {
  const action = args[0];

  if (action === 'start') {
    await startDaemon();
    console.log('Daemon started');
  } else if (action === 'stop') {
    if (isDaemonRunning()) {
      await stopDaemon();
      console.log('Daemon stopped');
    } else {
      console.log('Daemon not running');
    }
  } else if (action === 'status') {
    console.log(isDaemonRunning() ? 'Daemon running' : 'Daemon not running');
  } else {
    console.error('Usage: xcli daemon <start|stop|status>');
    process.exit(1);
  }
}
