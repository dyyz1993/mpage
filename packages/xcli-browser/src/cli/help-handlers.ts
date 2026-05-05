import { Core, getDaemonStatus } from '@dyyz1993/xcli-core';
import { VERSION, CORE_CONFIG } from './output.js';

export function showMainHelp(): void {
  console.log(`xcli-browser v${VERSION} - Browser automation CLI

Usage: xcli-browser [options] <command> [args]

Options:
  --json, -j             Output in JSON format
  --yaml                 Output in YAML format
  --session, -s <name>   Target session name (default: default)
  --cdp <endpoint>       CDP WebSocket endpoint to connect
  --no-color             Disable colored output
  --no-emoji             Disable emoji in output
  --quiet, -q            Quiet mode (suppress tips)
  --help, -h             Show help

Commands:
  session open <name> --url <url>    Open browser session
  session close <name>               Close session
  session list                       List sessions
  session kill                       Kill all sessions

  plugin install <source>            Install plugin
  plugin uninstall <id>              Uninstall plugin
  plugin list                        List installed plugins

  create <name> --template <type>    Create plugin from template
  init <name>                        Initialize new project

  config [key] [value]               Get/set config
  info                               Show system info
  daemon                             Start/stop daemon
  help [command]                     Show help

Direct Browser Commands:
  goto --url <url>                   Navigate to URL
  click --selector <sel>            Click element
  fill --selector <sel> --value <val>  Fill form field

Plugin Commands:
  <site> <command> [options]        Execute plugin command

Examples:
  xcli-browser session open my-session --url https://example.com
  xcli-browser goto --url https://example.com
  xcli-browser click --selector '#submit-btn'
  xcli-browser my-site scrape --query hello
`);
}

export function showInfo(): void {
  const core = new Core(CORE_CONFIG);
  const daemonStatus = getDaemonStatus({
    configDir: core.configDir,
    workerEntryPath: '',
  });

  console.log(`xcli-browser v${VERSION}
  Config dir:   ${core.configDir}
  Session dir:  ${core.sessionDir}
  Storage dir:  ${core.storageDir}
  Daemon:       ${daemonStatus.running ? `running (pid: ${daemonStatus.pid}, port: ${daemonStatus.port})` : 'stopped'}
  Node:         ${process.version}
  Platform:     ${process.platform} ${process.arch}
`);
}
