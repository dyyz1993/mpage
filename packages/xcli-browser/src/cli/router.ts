import { parseArgs, type CommandValues, type CommandArgs } from '@dyyz1993/xcli-core';
import { VERSION, getOutputMode, outputResult, outputError, helpGen } from './output.js';
import { showMainHelp, showInfo } from './help-handlers.js';
import { handleConfig, handleCreate, handleInit, handleDaemon } from './builtin-handlers.js';
import { handlePluginCommand } from './plugin-command.js';
import {
  handleSessionOpen,
  handleSessionClose,
  handleSessionList,
  handleSessionKill,
  handleSessionHelp,
} from './session-handlers.js';
import {
  handlePluginInstall,
  handlePluginUninstall,
  handlePluginList,
  handlePluginHelp,
} from './plugin-handlers.js';
import { handleDirectGoto, handleDirectClick, handleDirectFill } from './browser-handlers.js';

export async function routeCommand(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const { positional, options } = parsed;

  const values = options as CommandValues;
  const args = positional as CommandArgs;
  const mode = getOutputMode(values);

  if (options.help || options.h) {
    if (args.length > 0) {
      console.log(
        helpGen.generate({
          name: args.join(' '),
          description: `Help for ${args.join(' ')}`,
        })
      );
    } else {
      showMainHelp();
    }
    process.exit(0);
  }

  if (options.version || options.v) {
    console.log(`xcli-browser v${VERSION}`);
    process.exit(0);
  }

  if (args.length === 0) {
    showMainHelp();
    process.exit(0);
  }

  const command = args[0];
  const cmdArgs = args.slice(1);

  switch (command) {
    case 'session': {
      const subCommand = cmdArgs[0];
      switch (subCommand) {
        case 'open': {
          const result = await handleSessionOpen(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        case 'close': {
          const result = await handleSessionClose(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        case 'list':
        case 'ls': {
          const result = await handleSessionList(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        case 'kill': {
          const result = await handleSessionKill(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        default:
          console.log(handleSessionHelp());
      }
      break;
    }

    case 'plugin': {
      const subCommand = cmdArgs[0];
      switch (subCommand) {
        case 'install': {
          const result = await handlePluginInstall(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        case 'uninstall':
        case 'remove': {
          const result = await handlePluginUninstall(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        case 'list':
        case 'ls': {
          const result = await handlePluginList(cmdArgs.slice(1), values);
          outputResult(result, mode);
          break;
        }
        default:
          console.log(handlePluginHelp());
      }
      break;
    }

    case 'create': {
      await handleCreate(cmdArgs, values);
      break;
    }

    case 'init': {
      await handleInit(cmdArgs, values);
      break;
    }

    case 'config': {
      handleConfig(cmdArgs, values);
      break;
    }

    case 'info': {
      showInfo();
      break;
    }

    case 'help': {
      if (cmdArgs.length > 0) {
        const helpTarget = cmdArgs[0];
        if (helpTarget === 'session') {
          console.log(handleSessionHelp());
        } else if (helpTarget === 'plugin') {
          console.log(handlePluginHelp());
        } else {
          console.log(`Help for '${helpTarget}': use xcli-browser ${helpTarget} --help`);
        }
      } else {
        showMainHelp();
      }
      break;
    }

    case 'daemon': {
      await handleDaemon(cmdArgs, values);
      break;
    }

    case 'goto': {
      await handleDirectGoto(cmdArgs, values);
      break;
    }

    case 'click': {
      await handleDirectClick(cmdArgs, values);
      break;
    }

    case 'fill': {
      await handleDirectFill(cmdArgs, values);
      break;
    }

    default: {
      const siteName = command;
      const commandName = cmdArgs[0];
      if (!commandName) {
        outputError(
          `Missing command for site '${siteName}'. Usage: xcli-browser ${siteName} <command>`,
          mode
        );
        process.exit(1);
      }
      await handlePluginCommand(siteName, commandName, cmdArgs.slice(1), values);
    }
  }
}
