import * as fs from 'fs';
import * as path from 'path';

interface Improvement {
  id: string;
  title: string;
  status: 'proposed' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  source: string;
  assignee?: string;
  createdAt: string;
  relatedCases: string[];
  relatedModules: string[];
}

export class ImprovementTracker {
  private improvements: Map<string, Improvement> = new Map();

  constructor(private basePath: string = 'docs/improvements') {
    this.load();
  }

  async load(): Promise<void> {
    const files = await fs.promises.readdir(this.basePath, { recursive: true });
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.promises.readFile(path.join(this.basePath, file), 'utf-8');
        const improvement = this.parseImprovement(content);
        this.improvements.set(improvement.id, improvement);
      }
    }
  }

  parseImprovement(content: string): Improvement {
    const idMatch = content.match(/# IMP-(\d+):/);
    const titleMatch = content.match(/# IMP-\d+: (.+)/);
    const statusMatch = content.match(/\*\*状态\*\*:\s+(\w+)/);
    const priorityMatch = content.match(/\*\*优先级\*\*:\s+(\w+)/);
    const sourceMatch = content.match(/\*\*来源\*\*:\s+(.+)/);

    return {
      id: `IMP-${idMatch?.[1] || '0'}`,
      title: titleMatch?.[1] || 'Untitled',
      status: (statusMatch?.[1] as Improvement['status']) || 'proposed',
      priority: (priorityMatch?.[1] as Improvement['priority']) || 'medium',
      source: sourceMatch?.[1] || 'Unknown',
      relatedCases: [],
      relatedModules: [],
      createdAt: new Date().toISOString(),
    };
  }

  list(filters?: Partial<Improvement>): Improvement[] {
    let result = Array.from(this.improvements.values());

    if (filters?.status) {
      result = result.filter((imp) => imp.status === filters.status);
    }
    if (filters?.priority) {
      result = result.filter((imp) => imp.priority === filters.priority);
    }
    if (filters?.source) {
      result = result.filter((imp) => imp.source.includes(filters.source!));
    }

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async add(improvement: Omit<Improvement, 'id' | 'createdAt'>): Promise<Improvement> {
    const id = `IMP-${this.improvements.size + 1}`;
    const newImprovement: Improvement = {
      ...improvement,
      id,
      createdAt: new Date().toISOString(),
    };

    this.improvements.set(id, newImprovement);
    await this.save(newImprovement);

    return newImprovement;
  }

  async update(id: string, updates: Partial<Improvement>): Promise<Improvement | null> {
    const improvement = this.improvements.get(id);
    if (!improvement) return null;

    const updated = { ...improvement, ...updates };
    this.improvements.set(id, updated);
    await this.save(updated);

    return updated;
  }

  async save(improvement: Improvement): Promise<void> {
    const moduleDir = path.join(this.basePath, improvement.relatedModules[0] || 'mpage');
    await fs.promises.mkdir(moduleDir, { recursive: true });

    const filename = `${improvement.id}-${improvement.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(moduleDir, filename);

    const content = this.generateMarkdown(improvement);
    await fs.promises.writeFile(filepath, content, 'utf-8');
  }

  generateMarkdown(improvement: Improvement): string {
    return `# ${improvement.id}: ${improvement.title}

**状态**: ${improvement.status}
**优先级**: ${improvement.priority}
**来源**: ${improvement.source}
${improvement.assignee ? `**负责人**: ${improvement.assignee}` : ''}
**创建时间**: ${improvement.createdAt}

## 问题描述

### 当前问题

### 期望行为

## 影响范围

### 受影响的案例
${improvement.relatedCases.map((c) => `- ${c}`).join('\n')}

### 受影响的模块
${improvement.relatedModules.map((m) => `- ${m}`).join('\n')}

## 解决方案

### 方案概述

### 技术细节

### 迁移指南

## 验收标准

### 功能验收
- [ ]

### 测试验收
- [ ]

## 进度追踪

| 日期 | 进度 | 备注 |
|------|------|------|
| ${improvement.createdAt} | ${improvement.status} | 创建改进点 |

## 相关讨论

`;
  }

  generateReport(): string {
    const improvements = this.list();

    return `# 改进点追踪报告

生成时间: ${new Date().toISOString()}

## 概览

- 总数: ${improvements.length}
- 待处理: ${improvements.filter((i) => i.status === 'proposed').length}
- 进行中: ${improvements.filter((i) => i.status === 'in-progress').length}
- 已完成: ${improvements.filter((i) => i.status === 'done').length}
- 已阻塞: ${improvements.filter((i) => i.status === 'blocked').length}

## 高优先级改进点

${improvements
  .filter((i) => i.priority === 'high')
  .map((i) => `- [${i.status}] ${i.id}: ${i.title}`)
  .join('\n')}

## 进行中的改进点

${improvements
  .filter((i) => i.status === 'in-progress')
  .map((i) => `- ${i.id}: ${i.title}`)
  .join('\n')}
`;
  }
}

const tracker = new ImprovementTracker();
const command = process.argv[2];

switch (command) {
  case 'list': {
    const filters = process.argv[3] ? JSON.parse(process.argv[3]) : {};
    console.log(JSON.stringify(tracker.list(filters), null, 2));
    break;
  }
  case 'report':
    console.log(tracker.generateReport());
    break;
  default:
    console.log('Usage: tsx tools/improvement-tracker.ts [list|report] [filters]');
}
