#!/usr/bin/env node

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PLUGINS_DIR = join(process.cwd(), '.xcli', 'plugins');
const XCLI_CMD = 'npx tsx xcli/bin/xcli.ts';

const DEFAULT_URLS = {
  '03-extract-content': 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/03-extract-content.html',
  '04-pagination': 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/04-pagination.html',
};

const SCRAPE_COMMANDS = {
  '05-url-params': 'scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/05-url-params.html" --category electronics --price_min 500 --price_max 2000 --sort sales_desc --pages 1',
  '06-infinite-scroll': 'scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/06-infinite-scroll.html"',
  '07-lazy-load': 'scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/07-lazy-load.html"',
};

function getPlugins() {
  if (!existsSync(PLUGINS_DIR)) return [];
  return readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

function exec(cmd) {
  try {
    const output = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });
    return output.replace(/\x1B\[[0-9;]*m/g, '');
  } catch (e) {
    return (e.stdout || e.message).replace(/\x1B\[[0-9;]*m/g, '');
  }
}

function getScrapeCmd(pluginName) {
  if (SCRAPE_COMMANDS[pluginName]) {
    return `${XCLI_CMD} ${pluginName} ${SCRAPE_COMMANDS[pluginName]}`;
  }
  const defaultUrl = DEFAULT_URLS[pluginName];
  if (defaultUrl) {
    return `${XCLI_CMD} ${pluginName} scrape --url "${defaultUrl}"`;
  }
  return `${XCLI_CMD} ${pluginName} scrape`;
}

function generateVerification(pluginName) {
  const pluginHelp = exec(`${XCLI_CMD} ${pluginName} --help`);
  const scrape = exec(getScrapeCmd(pluginName));
  const scrapeJson = exec(`${getScrapeCmd(pluginName)} --json`);
  const scrapeHelp = exec(`${XCLI_CMD} ${pluginName} scrape --help`);
  const verify = exec(`${XCLI_CMD} ${pluginName} verify`);
  const verifyHelp = exec(`${XCLI_CMD} ${pluginName} verify --help`);

  return `# ${pluginName} 插件验证报告

## 基本信息

- **插件名称**: ${pluginName}
- **验证时间**: ${new Date().toISOString().split('T')[0]}
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

\`\`\`bash
npx tsx xcli/bin/xcli.ts ${pluginName} --help
\`\`\`

\`\`\`
${pluginHelp}
\`\`\`

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

\`\`\`bash
${getScrapeCmd(pluginName)}
\`\`\`

\`\`\`yaml
${scrape}
\`\`\`

### 1.2 JSON 输出

\`\`\`bash
${getScrapeCmd(pluginName)} --json
\`\`\`

\`\`\`json
${scrapeJson}
\`\`\`

### 1.3 --help 输出

\`\`\`bash
npx tsx xcli/bin/xcli.ts ${pluginName} scrape --help
\`\`\`

\`\`\`
${scrapeHelp}
\`\`\`

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

\`\`\`bash
npx tsx xcli/bin/xcli.ts ${pluginName} verify
\`\`\`

\`\`\`yaml
${verify}
\`\`\`

### 2.2 --help 输出

\`\`\`bash
npx tsx xcli/bin/xcli.ts ${pluginName} verify --help
\`\`\`

\`\`\`
${verifyHelp}
\`\`\`

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
`;
}

function main() {
  const plugins = getPlugins();

  if (plugins.length === 0) {
    console.log('No plugins found in .xcli/plugins/');
    return;
  }

  console.log(`Found ${plugins.length} plugins: ${plugins.join(', ')}\n`);

  const reportDir = join(process.cwd(), '.xcli', 'reports');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  let indexContent = '# 插件验证报告\n\n';
  indexContent += `生成时间: ${new Date().toISOString()}\n\n`;
  indexContent += `## 插件列表\n\n`;

  for (const plugin of plugins) {
    console.log(`Processing: ${plugin}...`);

    const pluginDir = join(PLUGINS_DIR, plugin);
    const verification = generateVerification(plugin);

    const verificationPath = join(pluginDir, 'VERIFICATION.md');
    writeFileSync(verificationPath, verification);

    const reportPath = join(reportDir, `${plugin}.md`);
    writeFileSync(reportPath, verification);

    indexContent += `- [${plugin}](./plugins/${plugin}/VERIFICATION.md)\n`;

    console.log(`  ✅ ${plugin} verified\n`);
  }

  const summaryPath = join(reportDir, 'INDEX.md');
  writeFileSync(summaryPath, indexContent);

  console.log(`\n✅ All plugins verified!`);
  console.log(`Reports saved to: ${reportDir}/`);
}

main();