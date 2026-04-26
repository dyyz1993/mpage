import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { HelpGenerator } from '../../src/core/help-generator';

describe('HelpGenerator', () => {
  const gen = new HelpGenerator();

  describe('generate', () => {
    it('should generate help with name and description', () => {
      const result = gen.generate({ name: 'scrape', description: 'Scrape data from page' });
      expect(result).toContain('scrape');
      expect(result).toContain('Scrape data from page');
    });

    it('should use emoji prefix when emoji=true', () => {
      const result = gen.generate(
        { name: 'scrape', description: 'test' },
        { emoji: true, color: true }
      );
      expect(result).toContain('📌');
    });

    it('should omit emoji when emoji=false', () => {
      const result = gen.generate(
        { name: 'scrape', description: 'test' },
        { emoji: false, color: true }
      );
      expect(result).not.toContain('📌');
    });

    it('should include zod parameters section when parameters provided', () => {
      const schema = z.object({
        selector: z.string().default('body'),
        limit: z.number().default(10),
      });
      const result = gen.generate(
        { name: 'cmd', parameters: schema },
        { emoji: false, color: false }
      );
      expect(result).toContain('selector');
      expect(result).toContain('limit');
      expect(result).toContain('Parameters');
    });

    it('should include options section when options provided', () => {
      const result = gen.generate(
        {
          name: 'cmd',
          options: [
            { name: 'output', short: 'o', type: 'string', description: 'Output format' },
            {
              name: 'verbose',
              type: 'boolean',
              description: 'Show verbose output',
              required: true,
            },
          ],
        },
        { emoji: false, color: false }
      );
      expect(result).toContain('--output');
      expect(result).toContain('-o');
      expect(result).toContain('Output format');
      expect(result).toContain('--verbose');
      expect(result).toContain('(required)');
    });

    it('should include result section when result schema provided', () => {
      const resultSchema = z.object({
        items: z.array(z.string()),
        total: z.number(),
      });
      const result = gen.generate(
        { name: 'cmd', result: resultSchema },
        { emoji: false, color: false }
      );
      expect(result).toContain('Result');
      expect(result).toContain('items');
      expect(result).toContain('total');
      expect(result).not.toContain('tips');
    });

    it('should include examples section', () => {
      const result = gen.generate(
        {
          name: 'cmd',
          examples: [
            { cmd: 'xcli site scrape', description: 'Scrape all data' },
            { cmd: 'xcli site scrape --limit 10', output: 'Scraped 10 items' },
          ],
        },
        { emoji: false, color: false }
      );
      expect(result).toContain('xcli site scrape');
      expect(result).toContain('Scrape all data');
      expect(result).toContain('Scraped 10 items');
    });

    it('should include tips section', () => {
      const result = gen.generate(
        { name: 'cmd', tips: ['Use --limit to cap results', 'Combine with --filter'] },
        { emoji: false, color: false }
      );
      expect(result).toContain('Use --limit to cap results');
      expect(result).toContain('Combine with --filter');
    });

    it('should handle command with no optional fields', () => {
      const result = gen.generate({ name: 'minimal', description: 'A minimal command' });
      expect(result).toContain('minimal');
      expect(result).not.toContain('Parameters');
      expect(result).not.toContain('Examples');
      expect(result).not.toContain('Tips');
    });

    it('should show option default value', () => {
      const result = gen.generate(
        {
          name: 'cmd',
          options: [{ name: 'format', type: 'string', description: 'fmt', default: 'json' }],
        },
        { emoji: false, color: false }
      );
      expect(result).toContain('[default: json]');
    });
  });

  describe('generateList', () => {
    it('should list commands with descriptions', () => {
      const result = gen.generateList([
        { name: 'scrape', description: 'Scrape data' },
        { name: 'login', description: 'Login to site' },
      ]);
      expect(result).toContain('Available Commands');
      expect(result).toContain('scrape');
      expect(result).toContain('Scrape data');
      expect(result).toContain('login');
      expect(result).toContain('Login to site');
    });

    it('should use emoji when enabled', () => {
      const result = gen.generateList([{ name: 'scrape', description: 'Scrape data' }], {
        emoji: true,
        color: true,
      });
      expect(result).toContain('🔹');
    });

    it('should omit emoji when disabled', () => {
      const result = gen.generateList([{ name: 'scrape', description: 'Scrape data' }], {
        emoji: false,
        color: true,
      });
      expect(result).not.toContain('🔹');
    });

    it('should handle empty commands list', () => {
      const result = gen.generateList([]);
      expect(result).toContain('Available Commands');
    });
  });

  describe('generateSiteHelp', () => {
    it('should generate site help with commands', () => {
      const result = gen.generateSiteHelp('Example', 'https://example.com', [
        { name: 'scrape', description: 'Scrape data' },
        { name: 'verify', description: 'Verify data' },
      ]);
      expect(result).toContain('Example');
      expect(result).toContain('https://example.com');
      expect(result).toContain('scrape');
      expect(result).toContain('verify');
      expect(result).toContain('xcli example');
      expect(result).toContain('--help');
    });

    it('should include emoji when enabled', () => {
      const result = gen.generateSiteHelp('Example', 'https://example.com', [], {
        emoji: true,
        color: true,
      });
      expect(result).toContain('🌐');
    });

    it('should handle empty commands', () => {
      const result = gen.generateSiteHelp('Test', 'https://test.com', []);
      expect(result).toContain('Test');
      expect(result).toContain('Commands:');
    });
  });

  describe('zod type resolution', () => {
    it('should resolve ZodString type', () => {
      const result = gen.generate(
        { name: 'cmd', parameters: z.object({ name: z.string() }) },
        { emoji: false, color: false }
      );
      expect(result).toContain('[string]');
    });

    it('should resolve ZodNumber type', () => {
      const result = gen.generate(
        { name: 'cmd', parameters: z.object({ count: z.number() }) },
        { emoji: false, color: false }
      );
      expect(result).toContain('[number]');
    });

    it('should resolve ZodBoolean type', () => {
      const result = gen.generate(
        { name: 'cmd', parameters: z.object({ verbose: z.boolean() }) },
        { emoji: false, color: false }
      );
      expect(result).toContain('[boolean]');
    });

    it('should resolve ZodArray type', () => {
      const result = gen.generate(
        { name: 'cmd', parameters: z.object({ tags: z.array(z.string()) }) },
        { emoji: false, color: false }
      );
      expect(result).toContain('tags');
    });

    it('should resolve ZodDefault with description via getZodType', () => {
      const schema = z.object({ page: z.number().default(1).describe('页码') });
      const result = gen.generate(
        { name: 'cmd', parameters: schema },
        { emoji: false, color: false }
      );
      expect(result).toContain('page');
      expect(result).toContain('页码');
    });

    it('should show optional marker for optional fields', () => {
      const result = gen.generate(
        { name: 'cmd', parameters: z.object({ name: z.string().optional() }) },
        { emoji: false, color: false }
      );
      expect(result).toContain('name');
    });
  });
});
