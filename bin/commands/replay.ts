import * as path from 'path';
import { fileURLToPath } from 'url';
import { sendRequest, getOrCreateSession } from '../../src/index.js';

export async function handleReplay(
  commandInput: string,
  args: string[],
  __filename: string,
  sessionName: string,
  cdpEndpoint: string
): Promise<void> {
  const parts = commandInput.split(' ');
  const filePath = parts[1];

  if (!filePath) {
    console.error('请指定录制文件路径');
    process.exit(1);
  }

  let slowMo = 0;
  let stopOnError = true;

  for (let i = args.indexOf('replay') + 2; i < args.length; i++) {
    if (args[i] === '--slow-mo') {
      slowMo = parseInt(args[++i], 10);
    } else if (args[i] === '--continue-on-error') {
      stopOnError = false;
    }
  }

  const ext = __filename.endsWith('.js') ? '.js' : '.ts';
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = path.join(__dirname, `mpage-server${ext}`);
  const sessionInfo = await getOrCreateSession(serverPath, sessionName, cdpEndpoint);
  if (!sessionInfo) {
    console.error('Failed to create session');
    process.exit(1);
  }

  console.log('🔄 开始回放...');
  console.log(`📄 文件: ${filePath}`);

  const result = await sendRequest(
    sessionInfo.socketPath,
    {
      action: 'replay',
      filePath,
      options: { slowMo, stopOnError },
    },
    300000
  );

  if (result.success) {
    const content = result.content as {
      eventsPlayed: number;
      totalEvents: number;
      duration: number;
      errors?: Array<{ eventIndex: number; event: { type: string }; error: string }>;
    };
    console.log('✅ 回放完成');
    console.log(`📊 成功: ${content.eventsPlayed}/${content.totalEvents}`);
    console.log(`⏱️  耗时: ${Math.round(content.duration / 1000)}s`);

    if (content.errors && content.errors.length > 0) {
      console.log('');
      console.log('❌ 错误:');
      for (const err of content.errors) {
        console.log(`  [${err.eventIndex}] ${err.event.type}: ${err.error}`);
      }
    }
  } else {
    console.error('❌ 回放失败:', result.error);
    process.exit(1);
  }
  process.exit(0);
}
