import type { Command, Option } from '../protocol/plugin-protocol';

export interface HelpOptions {
  color: boolean;
  emoji: boolean;
}

export class HelpGenerator {
  generate(command: any, options?: HelpOptions): string {
    const { color, emoji } = { color: true, emoji: true, ...options };

    const lines: string[] = [];

    lines.push(this.header(command, color, emoji));
    lines.push('');
    lines.push(this.description(command, color, emoji));

    if (command.parameters) {
      lines.push('');
      lines.push(this.zodParameters(command.parameters, color, emoji));
    } else if (command.options && command.options.length > 0) {
      lines.push('');
      lines.push(this.options(command.options, color, emoji));
    }

    if (command.result) {
      lines.push('');
      lines.push(this.zodResult(command.result, color, emoji));
    }

    if (command.examples && command.examples.length > 0) {
      lines.push('');
      lines.push(this.examples(command.examples, color, emoji));
    }

    if (command.tips && command.tips.length > 0) {
      lines.push('');
      lines.push(this.tips(command.tips, color, emoji));
    }

    return lines.join('\n');
  }

  private header(cmd: Command, color: boolean, emoji: boolean): string {
    const prefix = emoji ? '📌 ' : '';
    return `${prefix}${cmd.name} - ${cmd.description}`;
  }

  private description(cmd: Command, _color: boolean, _emoji: boolean): string {
    return cmd.description;
  }

  private zodParameters(schema: any, _color: boolean, emoji: boolean): string {
    const prefix = emoji ? '⚙️  ' : '';
    const lines: string[] = [];
    lines.push(`${prefix}Parameters (Zod):`);

    try {
      const shape = schema.shape || schema._def?.shape?.();
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          const fieldSchema = value as any;
          const description = fieldSchema.description || fieldSchema._def?.description || '';
          const type = this.getZodType(fieldSchema);
          const required = fieldSchema.isOptional ? '(optional)' : '(required)';
          const defaultVal =
            fieldSchema.defaultValue !== undefined ? `[default: ${fieldSchema.defaultValue}]` : '';

          lines.push(`  --${key} ${type} ${required} ${defaultVal}`.replace(/\s+/g, ' ').trim());
          if (description) {
            lines.push(`    ${description}`);
          }
        }
      }
    } catch (e) {
      lines.push(`  (无法解析参数 schema)`);
    }

    return lines.join('\n');
  }

  private zodResult(schema: any, color: boolean, emoji: boolean): string {
    const prefix = emoji ? '📤 ' : '';
    const lines: string[] = [];
    lines.push(`${prefix}Result (Zod):`);

    try {
      const shape = schema.shape || schema._def?.shape?.();
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          if (key === 'tips' || key === 'errors') continue;

          const fieldSchema = value as any;
          const description = fieldSchema.description || fieldSchema._def?.description || '';
          const type = this.getZodType(fieldSchema);

          lines.push(`  ${key}: ${type}`);
          if (description) {
            lines.push(`    ${description}`);
          }
        }
      }
    } catch (e) {
      lines.push(`  (无法解析结果 schema)`);
    }

    return lines.join('\n');
  }

  private getZodType(schema: any, depth = 0): string {
    try {
      if (!schema) return '[null]';
      if (depth > 3) return '[max-depth]';

      if (typeof schema.isOptional === 'function' && schema.isOptional()) {
        return this.getZodType(schema.unwrap(), depth + 1);
      }
      if (typeof schema.isNullable === 'function' && schema.isNullable()) {
        return this.getZodType(schema.unwrap(), depth + 1);
      }

      const typeName = schema._def?.typeName || schema.constructor?.name;

      if (typeName === 'ZodString') return '[string]';
      if (typeName === 'ZodNumber') return '[number]';
      if (typeName === 'ZodBoolean') return '[boolean]';
      if (typeName === 'ZodArray') {
        let inner = schema._def?.type;
        if (!inner) inner = schema._def?.innerType;
        if (!inner) inner = schema._def?.wrapped;
        if (!inner && schema.unwrap) inner = schema.unwrap()._def?.type;
        const innerStr = inner ? this.getZodType(inner, depth + 1) : '[any]';
        return `[${innerStr}]`;
      }
      if (typeName === 'ZodObject') {
        const shape = schema.shape || schema._def?.shape?.();
        if (shape && Object.keys(shape).length > 0) {
          return '[object] { ' + Object.keys(shape).join(', ') + ' }';
        }
        return '[object]';
      }
      if (typeName === 'ZodOptional' || typeName === 'ZodDefault') {
        let inner = schema._def?.innerType;
        if (!inner && schema.innerType) inner = schema.innerType;
        if (!inner) inner = schema._def?.type;
        if (!inner && schema.unwrap) inner = schema.unwrap();
        if (!inner) {
          if (schema._def?.defaultValue !== undefined) return '[string]';
          return '[any]';
        }
        return this.getZodType(inner, depth + 1);
      }

      return `[${typeName}]`;
    } catch (e) {
      return '[any]';
    }
  }

  private options(options: Option[], color: boolean, emoji: boolean): string {
    const lines: string[] = [];
    const prefix = emoji ? '⚙️  ' : '';
    lines.push(`${prefix}Options:`);

    for (const opt of options) {
      const short = opt.short ? `(-${opt.short})` : '';
      const required = opt.required ? '(required)' : '';
      const defaultVal = opt.default !== undefined ? `[default: ${opt.default}]` : '';
      const type = `[${opt.type}]`;

      const optStr = `  --${opt.name} ${short} ${type} ${required} ${defaultVal}`
        .replace(/\s+/g, ' ')
        .trim();
      lines.push(optStr);
      lines.push(`    ${opt.description}`);
    }

    return lines.join('\n');
  }

  private examples(
    examples: Array<{ cmd: string; description?: string; output?: string }>,
    color: boolean,
    emoji: boolean
  ): string {
    const lines: string[] = [];
    const prefix = emoji ? '📝 ' : '';
    lines.push(`${prefix}Examples:`);

    for (const ex of examples) {
      lines.push(`  $ ${ex.cmd}`);
      if (ex.output) {
        lines.push('');
        const outputLines = ex.output.split('\n');
        for (const line of outputLines) {
          lines.push(`    ${line}`);
        }
      } else if (ex.description) {
        lines.push(`    ${ex.description}`);
      }
    }

    return lines.join('\n');
  }

  private tips(tips: string[], color: boolean, emoji: boolean): string {
    const lines: string[] = [];
    const prefix = emoji ? '💡 ' : '';
    lines.push(`${prefix}Tips:`);

    for (const tip of tips) {
      lines.push(`  ${tip}`);
    }

    return lines.join('\n');
  }

  generateList(commands: Command[], options?: HelpOptions): string {
    const { emoji } = { emoji: true, ...options };
    const prefix = emoji ? '🔹 ' : '';

    const lines: string[] = [];
    lines.push('Available Commands:');
    lines.push('');

    for (const cmd of commands) {
      lines.push(`${prefix}${cmd.name.padEnd(20)} ${cmd.description}`);
    }

    return lines.join('\n');
  }

  generateSiteHelp(siteName: string, url: string, commands: any[], options?: HelpOptions): string {
    const { emoji } = { emoji: true, ...options };
    const lines: string[] = [];

    lines.push('');
    lines.push(`${emoji ? '🌐 ' : ''}${siteName} (${url})`);
    lines.push('');
    lines.push('Commands:');

    for (const cmd of commands) {
      const cmdStr = `  ${cmd.name.padEnd(15)} ${cmd.description}`;
      lines.push(cmdStr);
    }

    lines.push('');
    lines.push(`Use 'xcli ${siteName.toLowerCase()} <command> --help' for more info.`);

    return lines.join('\n');
  }
}

export const helpGenerator = new HelpGenerator();
