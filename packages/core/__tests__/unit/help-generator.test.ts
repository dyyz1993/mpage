import { describe, it, expect } from 'vitest';
import { HelpGenerator, helpGenerator, type HelpOptions } from '../../src/help/help-generator.js';
import { z } from 'zod';

describe('HelpGenerator — header & description', () => {
  const gen = new HelpGenerator();

  it('should generate help with name and description', () => {
    const result = gen.generate({ name: 'scrape', description: 'Scrape data from page' });
    expect(result).toContain('scrape');
    expect(result).toContain('Scrape data from page');
  });

  it('should handle missing name', () => {
    const result = gen.generate({ description: 'A command' });
    expect(result).toContain('A command');
  });

  it('should handle missing description', () => {
    const result = gen.generate({ name: 'test' });
    expect(result).toContain('test');
  });

  it('should handle empty command object', () => {
    const result = gen.generate({});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include emoji when enabled (default)', () => {
    const result = gen.generate({ name: 'cmd', description: 'desc' });
    expect(result).toContain('📌');
  });

  it('should exclude emoji when disabled', () => {
    const result = gen.generate(
      { name: 'cmd', description: 'desc' },
      { color: false, emoji: false }
    );
    expect(result).not.toContain('📌');
  });
});

describe('HelpGenerator — parameters (Zod)', () => {
  const gen = new HelpGenerator();

  it('should render Zod object parameters', () => {
    const schema = z.object({
      keyword: z.string().describe('Search keyword'),
      limit: z.number().describe('Max results'),
    });
    const result = gen.generate({ name: 'search', parameters: schema });
    expect(result).toContain('Parameters');
    expect(result).toContain('--keyword');
    expect(result).toContain('--limit');
    expect(result).toContain('Search keyword');
    expect(result).toContain('Max results');
  });

  it('should show (optional) for optional fields', () => {
    const schema = z.object({
      query: z.string().describe('Query text'),
      page: z.string().optional().describe('Page number'),
    });
    const result = gen.generate({ name: 'cmd', parameters: schema });
    expect(result).toContain('(optional)');
  });

  it('should handle empty Zod schema', () => {
    const schema = z.object({});
    const result = gen.generate({ name: 'cmd', parameters: schema });
    expect(result).toContain('Parameters');
  });

  it('should show type annotations', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
      active: z.boolean(),
      tags: z.array(z.string()),
    });
    const result = gen.generate({ name: 'cmd', parameters: schema });
    expect(result).toContain('[string]');
    expect(result).toContain('[number]');
    expect(result).toContain('[boolean]');
    expect(result).toContain('[[string]]');
  });
});

describe('HelpGenerator — options', () => {
  const gen = new HelpGenerator();

  it('should render options with name, type, and description', () => {
    const result = gen.generate({
      name: 'cmd',
      options: [{ name: 'output', type: 'string' as const, description: 'Output format' }],
    });
    expect(result).toContain('--output');
    expect(result).toContain('[string]');
    expect(result).toContain('Output format');
  });

  it('should render short option', () => {
    const result = gen.generate({
      name: 'cmd',
      options: [
        { name: 'verbose', short: 'v', type: 'boolean' as const, description: 'Verbose output' },
      ],
    });
    expect(result).toContain('-v');
  });

  it('should render required marker', () => {
    const result = gen.generate({
      name: 'cmd',
      options: [
        { name: 'url', type: 'string' as const, description: 'Target URL', required: true },
      ],
    });
    expect(result).toContain('(required)');
  });

  it('should render default value', () => {
    const result = gen.generate({
      name: 'cmd',
      options: [
        { name: 'format', type: 'string' as const, description: 'Output format', default: 'json' },
      ],
    });
    expect(result).toContain('[default: json]');
  });

  it('should handle multiple options', () => {
    const result = gen.generate({
      name: 'cmd',
      options: [
        { name: 'a', type: 'string' as const, description: 'Option A' },
        { name: 'b', type: 'number' as const, description: 'Option B' },
        { name: 'c', type: 'boolean' as const, description: 'Option C' },
      ],
    });
    expect(result).toContain('--a');
    expect(result).toContain('--b');
    expect(result).toContain('--c');
  });

  it('should prefer parameters over options when both present', () => {
    const schema = z.object({ query: z.string() });
    const result = gen.generate({
      name: 'cmd',
      parameters: schema,
      options: [{ name: 'x', type: 'string' as const, description: 'X' }],
    });
    expect(result).toContain('Parameters');
    expect(result).not.toContain('Options');
  });
});

describe('HelpGenerator — result', () => {
  const gen = new HelpGenerator();

  it('should render result schema', () => {
    const schema = z.object({
      items: z.array(z.string()).describe('List of items'),
      total: z.number().describe('Total count'),
    });
    const result = gen.generate({ name: 'cmd', result: schema });
    expect(result).toContain('Result');
    expect(result).toContain('items:');
    expect(result).toContain('total:');
  });

  it('should skip tips and errors keys in result', () => {
    const schema = z.object({
      data: z.array(z.string()),
      tips: z.array(z.string()),
      errors: z.array(z.string()),
    });
    const result = gen.generate({ name: 'cmd', result: schema });
    expect(result).toContain('data:');
    expect(result).not.toContain('tips:');
    expect(result).not.toContain('errors:');
  });
});

describe('HelpGenerator — examples', () => {
  const gen = new HelpGenerator();

  it('should render examples with command', () => {
    const result = gen.generate({
      name: 'cmd',
      examples: [{ cmd: 'xcli site scrape --query "test"' }],
    });
    expect(result).toContain('$ xcli site scrape --query "test"');
    expect(result).toContain('Examples');
  });

  it('should render example description', () => {
    const result = gen.generate({
      name: 'cmd',
      examples: [{ cmd: 'xcli test', description: 'Run test' }],
    });
    expect(result).toContain('Run test');
  });

  it('should render example output', () => {
    const result = gen.generate({
      name: 'cmd',
      examples: [{ cmd: 'xcli test', output: 'OK\nDone' }],
    });
    expect(result).toContain('OK');
    expect(result).toContain('Done');
  });

  it('should prefer output over description', () => {
    const result = gen.generate({
      name: 'cmd',
      examples: [{ cmd: 'xcli test', description: 'Run test', output: 'result output' }],
    });
    expect(result).toContain('result output');
  });
});

describe('HelpGenerator — tips', () => {
  const gen = new HelpGenerator();

  it('should render tips', () => {
    const result = gen.generate({
      name: 'cmd',
      tips: ['Use --limit to cap results', 'Combine with --format json'],
    });
    expect(result).toContain('Tips');
    expect(result).toContain('Use --limit to cap results');
    expect(result).toContain('Combine with --format json');
  });

  it('should include emoji for tips by default', () => {
    const result = gen.generate({ name: 'cmd', tips: ['tip1'] });
    expect(result).toContain('💡');
  });

  it('should exclude emoji when disabled', () => {
    const result = gen.generate({ name: 'cmd', tips: ['tip1'] }, { color: false, emoji: false });
    expect(result).not.toContain('💡');
    expect(result).toContain('Tips');
  });
});

describe('HelpGenerator — generateList', () => {
  const gen = new HelpGenerator();

  it('should list commands with name and description', () => {
    const result = gen.generateList([
      { name: 'scrape', description: 'Scrape data', parameters: z.object({}), scope: 'page' },
      { name: 'verify', description: 'Verify page', parameters: z.object({}), scope: 'page' },
    ]);
    expect(result).toContain('Available Commands');
    expect(result).toContain('scrape');
    expect(result).toContain('Scrape data');
    expect(result).toContain('verify');
    expect(result).toContain('Verify page');
  });

  it('should include emoji by default', () => {
    const result = gen.generateList([
      { name: 'test', description: 'Test', parameters: z.object({}), scope: 'page' },
    ]);
    expect(result).toContain('🔹');
  });

  it('should exclude emoji when disabled', () => {
    const result = gen.generateList(
      [{ name: 'test', description: 'Test', parameters: z.object({}), scope: 'page' }],
      { color: false, emoji: false }
    );
    expect(result).not.toContain('🔹');
  });

  it('should handle empty command list', () => {
    const result = gen.generateList([]);
    expect(result).toContain('Available Commands');
  });
});

describe('HelpGenerator — generateSiteHelp', () => {
  const gen = new HelpGenerator();

  it('should show site name and URL', () => {
    const result = gen.generateSiteHelp('MySite', 'https://example.com', [
      { name: 'scrape', description: 'Scrape data' },
    ]);
    expect(result).toContain('MySite');
    expect(result).toContain('https://example.com');
  });

  it('should list commands', () => {
    const result = gen.generateSiteHelp('site', 'https://x.com', [
      { name: 'scrape', description: 'Scrape' },
      { name: 'search', description: 'Search' },
    ]);
    expect(result).toContain('scrape');
    expect(result).toContain('Scrape');
    expect(result).toContain('search');
    expect(result).toContain('Search');
  });

  it('should include usage hint with cliName', () => {
    const result = gen.generateSiteHelp('site', 'https://x.com', [], { cliName: 'mycli' });
    expect(result).toContain('mycli site');
    expect(result).toContain('--help');
  });

  it('should default cliName to xcli', () => {
    const result = gen.generateSiteHelp('site', 'https://x.com', []);
    expect(result).toContain("'xcli site");
  });

  it('should include emoji by default', () => {
    const result = gen.generateSiteHelp('site', 'https://x.com', []);
    expect(result).toContain('🌐');
  });

  it('should exclude emoji when disabled', () => {
    const result = gen.generateSiteHelp('site', 'https://x.com', [], {
      color: false,
      emoji: false,
    });
    expect(result).not.toContain('🌐');
  });
});

describe('helpGenerator singleton', () => {
  it('should be an instance of HelpGenerator', () => {
    expect(helpGenerator).toBeInstanceOf(HelpGenerator);
  });
});
