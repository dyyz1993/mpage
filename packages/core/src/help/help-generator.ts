import type { Command, Option, ZodSchema } from '../protocol/plugin-protocol.js';

interface HelpCommand {
  name?: string;
  description?: string;
  parameters?: ZodSchema;
  options?: Option[];
  result?: ZodSchema;
  examples?: Array<{ cmd: string; description?: string; output?: string }>;
  tips?: string[];
}

export interface HelpOptions {
  color: boolean;
  emoji: boolean;
}

export class HelpGenerator {
  generate(command: HelpCommand, options?: HelpOptions): string {
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

  private header(
    cmd: { name?: string; description?: string },
    color: boolean,
    emoji: boolean
  ): string {
    const prefix = emoji ? '📌 ' : '';
    return `${prefix}${cmd.name || ''} - ${cmd.description || ''}`;
  }

  private description(cmd: { description?: string }, _color: boolean, _emoji: boolean): string {
    return cmd.description || '';
  }

  private zodParameters(schema: ZodSchema, _color: boolean, emoji: boolean): string {
    const prefix = emoji ? '⚙️  ' : '';
    const lines: string[] = [];
    lines.push(`${prefix}Parameters (Zod):`);

    try {
      const shape = this.extractShape(schema);
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          const fieldSchema = value as unknown as Record<string, unknown>;
          const fieldDef = fieldSchema._def as Record<string, unknown> | undefined;
          const description =
            (fieldSchema.description as string) || (fieldDef?.description as string) || '';
          const type = this.getZodType(value);
          const required =
            typeof fieldSchema.isOptional === 'function' &&
            (fieldSchema.isOptional as () => boolean)()
              ? '(optional)'
              : '(required)';
          const defaultValueFn = (fieldDef as Record<string, unknown> | undefined)?.defaultValue as
            | (() => unknown)
            | undefined;
          const defaultVal = defaultValueFn ? `[default: ${JSON.stringify(defaultValueFn())}]` : '';

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

  private zodResult(schema: ZodSchema, color: boolean, emoji: boolean): string {
    const prefix = emoji ? '📤 ' : '';
    const lines: string[] = [];
    lines.push(`${prefix}Result (Zod):`);

    try {
      const shape = this.extractShape(schema);
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          if (key === 'tips' || key === 'errors') continue;

          const fieldSchema = value as unknown as Record<string, unknown>;
          const fieldDef = fieldSchema._def as Record<string, unknown> | undefined;
          const description =
            (fieldSchema.description as string) || (fieldDef?.description as string) || '';
          const type = this.getZodType(value);

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

  /**
   * Extract the field shape from a Zod schema, unwrapping ZodDefault/ZodOptional/
   * ZodNullable wrappers that may hide the underlying ZodObject.
   */
  private extractShape(schema: unknown): Record<string, unknown> | null {
    const s = schema as Record<string, unknown>;

    // Direct shape access (ZodObject)
    let shape = s.shape as Record<string, unknown> | undefined;
    if (shape) return shape;

    // shape on _def (some wrappers expose it here)
    shape = (s._def as Record<string, unknown> | undefined)?.shape as
      | Record<string, unknown>
      | undefined;
    if (shape) return shape;

    // Unwrap ZodDefault / ZodOptional / ZodNullable
    const sDef = s._def as Record<string, unknown> | undefined;
    const typeName = (sDef?.typeName as string) || (sDef?.type as string) || '';
    const normalized = typeName.replace(/^Zod/, '').toLowerCase();

    if (['default', 'optional', 'nullable'].includes(normalized)) {
      const inner = sDef?.innerType as unknown;
      if (inner) return this.extractShape(inner);
      if (typeof s.unwrap === 'function') return this.extractShape((s.unwrap as () => unknown)());
    }

    return null;
  }

  private getZodType(schema: unknown, depth = 0): string {
    try {
      if (!schema) return '[null]';
      if (depth > 5) return '[max-depth]';

      const s = schema as Record<string, unknown>;
      const sDef = s._def as Record<string, unknown> | undefined;
      const typeName =
        (sDef?.typeName as string) ||
        (sDef?.type as string) ||
        (schema as object).constructor?.name;

      const normalized = typeName?.replace(/^Zod/, '').toLowerCase() || '';

      if (normalized === 'optional' || normalized === 'nullable') {
        const inner =
          typeof s.unwrap === 'function'
            ? (s.unwrap as () => unknown)()
            : (sDef?.innerType as unknown);
        return inner ? this.getZodType(inner, depth + 1) : '[unknown]';
      }

      if (normalized === 'default') {
        const inner = sDef?.innerType as unknown;
        return inner ? this.getZodType(inner, depth + 1) : '[unknown]';
      }

      if (normalized === 'string') return '[string]';
      if (normalized === 'number') return '[number]';
      if (normalized === 'boolean') return '[boolean]';
      if (normalized === 'array') {
        const inner = sDef?.element;
        const innerStr = inner ? this.getZodType(inner, depth + 1) : 'unknown';
        // Use [] suffix notation instead of double brackets: [[string]] → [string[]]
        const clean = innerStr.replace(/^\[|\]$/g, '');
        return `[${clean}[]]`;
      }
      if (normalized === 'object') {
        const shape =
          (s.shape as Record<string, unknown>) || (sDef?.shape as Record<string, unknown>);
        if (shape && Object.keys(shape).length > 0) {
          return '[object] { ' + Object.keys(shape).join(', ') + ' }';
        }
        return '[object]';
      }
      if (normalized === 'enum') {
        const values =
          (sDef?.values as unknown[] | undefined) ??
          (sDef?.entries ? Object.keys(sDef.entries as Record<string, unknown>) : undefined);
        if (values && values.length > 0) {
          return '[' + values.join('|') + ']';
        }
        return '[enum]';
      }
      if (normalized === 'literal') {
        const val = sDef?.value;
        return val !== undefined ? `[${JSON.stringify(val)}]` : '[literal]';
      }
      if (normalized === 'union') {
        const options = sDef?.options as unknown[] | undefined;
        if (options && options.length > 0) {
          return options.map((o) => this.getZodType(o, depth + 1)).join(' | ');
        }
        return '[union]';
      }
      if (normalized === 'record') {
        const valType = sDef?.valueType;
        return valType ? `[record<${this.getZodType(valType, depth + 1)}>]` : '[record]';
      }

      return normalized ? `[${normalized}]` : '[unknown]';
    } catch (e) {
      return '[unknown]';
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

  generateSiteHelp(
    siteName: string,
    url: string,
    commands: Array<{ name: string; description: string }>,
    options?: HelpOptions & { cliName?: string }
  ): string {
    const { emoji, cliName } = { emoji: true, cliName: 'xcli', ...options };
    const lines: string[] = [];

    lines.push('');
    lines.push(`${emoji ? '🌐 ' : ''}${siteName} (${url})`);
    lines.push('');

    const { ungrouped, grouped } = this.groupCommands(commands);

    if (ungrouped.length > 0) {
      lines.push('Commands:');
      for (const cmd of ungrouped) {
        const cmdStr = `  ${cmd.name.padEnd(15)} ${cmd.description}`;
        lines.push(cmdStr);
      }
      lines.push('');
    }

    for (const [groupName, groupCmds] of grouped) {
      lines.push(`${groupName}:`);
      for (const cmd of groupCmds) {
        const subName = cmd.name.slice(groupName.length + 1);
        const cmdStr = `  ${subName.padEnd(15)} ${cmd.description}`;
        lines.push(cmdStr);
      }
      lines.push('');
    }

    lines.push(`Use '${cliName} ${siteName.toLowerCase()} <command> --help' for more info.`);

    return lines.join('\n');
  }

  private groupCommands(commands: Array<{ name: string; description: string }>): {
    ungrouped: Array<{ name: string; description: string }>;
    grouped: Map<string, Array<{ name: string; description: string }>>;
  } {
    const ungrouped: Array<{ name: string; description: string }> = [];
    const grouped = new Map<string, Array<{ name: string; description: string }>>();

    for (const cmd of commands) {
      const dotIndex = cmd.name.indexOf('.');
      if (dotIndex !== -1) {
        const groupName = cmd.name.slice(0, dotIndex);
        if (!grouped.has(groupName)) {
          grouped.set(groupName, []);
        }
        grouped.get(groupName)!.push(cmd);
      } else {
        ungrouped.push(cmd);
      }
    }

    return { ungrouped, grouped };
  }
}

export const helpGenerator = new HelpGenerator();
