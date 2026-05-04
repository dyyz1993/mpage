import * as fs from 'fs';
import * as path from 'path';

interface PluginMetadata {
  phase: number;
  difficulty: string;
  dependencies: {
    mpage: string[];
    xcli: string[];
  };
  improvements: string[];
  status: 'proposed' | 'in-progress' | 'done';
  coverage: number;
}

interface Metadata {
  plugins: Record<string, PluginMetadata>;
  phases: Record<string, {
    name: string;
    plugins: string[];
    status: string;
  }>;
  mpageCapabilities: Record<string, { implemented: boolean; version: string | null }>;
  xcliFeatures: Record<string, { implemented: boolean; version: string | null }>;
}

export class MetadataQuery {
  constructor(private metadataPath: string = '.xcli/plugins/metadata.json') {
    this.load();
  }

  private metadata: Metadata | null = null;

  load(): void {
    try {
      const content = fs.readFileSync(this.metadataPath, 'utf-8');
      this.metadata = JSON.parse(content);
    } catch (e) {
      this.metadata = {
        plugins: {},
        phases: {},
        mpageCapabilities: {},
        xcliFeatures: {},
      };
    }
  }

  save(): void {
    if (!this.metadata) return;
    fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf-8');
  }

  getPlugin(pluginId: string): PluginMetadata | null {
    return this.metadata?.plugins[pluginId] || null;
  }

  getPhase(phase: number): { name: string; plugins: string[]; status: string } | null {
    return this.metadata?.phases[String(phase)] || null;
  }

  getPluginsByStatus(status: string): PluginMetadata[] {
    if (!this.metadata) return [];
    return Object.entries(this.metadata.plugins)
      .filter(([_, meta]) => meta.status === status)
      .map(([_, meta]) => meta);
  }

  getRequiredCapabilities(pluginId: string): { mpage: string[]; xcli: string[] } {
    const plugin = this.getPlugin(pluginId);
    return plugin?.dependencies || { mpage: [], xcli: [] };
  }

  getMissingCapabilities(): { mpage: string[]; xcli: string[] } {
    if (!this.metadata) return { mpage: [], xcli: [] };

    const requiredMpage = new Set<string>();
    const requiredXcli = new Set<string>();

    Object.values(this.metadata.plugins).forEach((plugin) => {
      plugin.dependencies.mpage.forEach((cap) => requiredMpage.add(cap));
      plugin.dependencies.xcli.forEach((feat) => requiredXcli.add(feat));
    });

    const missingMpage = Array.from(requiredMpage).filter(
      (cap) => !this.metadata!.mpageCapabilities[cap]?.implemented
    );
    const missingXcli = Array.from(requiredXcli).filter(
      (feat) => !this.metadata!.xcliFeatures[feat]?.implemented
    );

    return { mpage: missingMpage, xcli: missingXcli };
  }

  getPhaseProgress(phase: number): { total: number; done: number; progress: number } {
    const phaseInfo = this.getPhase(phase);
    if (!phaseInfo) return { total: 0, done: 0, progress: 0 };

    const done = phaseInfo.plugins.filter((id) => this.metadata?.plugins[id]?.status === 'done').length;
    const total = phaseInfo.plugins.length;

    return {
      total,
      done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  generateReport(): string {
    if (!this.metadata) return 'No metadata available';

    const lines: string[] = [];

    lines.push('# 36个案例实施进度报告\n');
    lines.push(`生成时间: ${new Date().toISOString()}\n`);

    const allPlugins = Object.values(this.metadata.plugins);
    const done = allPlugins.filter((p) => p.status === 'done').length;
    const inProgress = allPlugins.filter((p) => p.status === 'in-progress').length;
    const proposed = allPlugins.filter((p) => p.status === 'proposed').length;

    lines.push('## 总体进度\n');
    lines.push(`- 总数: ${allPlugins.length}`);
    lines.push(`- 已完成: ${done} (${Math.round((done / allPlugins.length) * 100)}%)`);
    lines.push(`- 进行中: ${inProgress} (${Math.round((inProgress / allPlugins.length) * 100)}%)`);
    lines.push(`- 待开始: ${proposed} (${Math.round((proposed / allPlugins.length) * 100)}%)\n`);

    for (let i = 1; i <= 8; i++) {
      const phase = this.getPhase(i);
      if (!phase) continue;

      const progress = this.getPhaseProgress(i);
      lines.push(`### Phase ${i}: ${phase.name}`);
      lines.push(`- 进度: ${progress.done}/${progress.total} (${progress.progress}%)`);
      lines.push(`- 状态: ${phase.status}\n`);
    }

    lines.push('## 缺失能力\n');
    const missing = this.getMissingCapabilities();
    if (missing.mpage.length > 0) {
      lines.push('### mpage');
      missing.mpage.forEach((cap) => lines.push(`- ${cap}`));
    }
    if (missing.xcli.length > 0) {
      lines.push('\n### xcli');
      missing.xcli.forEach((feat) => lines.push(`- ${feat}`));
    }

    return lines.join('\n');
  }
}

const query = new MetadataQuery();
const command = process.argv[2];

switch (command) {
  case 'plugin':
    console.log(JSON.stringify(query.getPlugin(process.argv[3]), null, 2));
    break;
  case 'phase':
    console.log(JSON.stringify(query.getPhase(parseInt(process.argv[3])), null, 2));
    break;
  case 'missing':
    console.log(JSON.stringify(query.getMissingCapabilities(), null, 2));
    break;
  case 'report':
    console.log(query.generateReport());
    break;
  default:
    console.log('Usage: tsx tools/metadata-query.ts [plugin|phase|missing|report] [args]');
}
