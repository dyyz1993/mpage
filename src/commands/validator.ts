import type { ZodSchema } from '../types.js';
import { commands } from './definitions.js';

export class ParamValidationError extends Error {
  readonly command: string;
  readonly issues: string[];

  constructor(command: string, issues: string[]) {
    super(`Invalid args for '${command}': ${issues.join(', ')}`);
    this.name = 'ParamValidationError';
    this.command = command;
    this.issues = issues;
  }
}

export function validateCommandParams(
  commandName: string,
  params: Record<string, unknown>,
  schema?: ZodSchema
): Record<string, unknown> {
  const def = commands[commandName];
  const zodSchema = schema || def?.schema;
  if (!zodSchema) return params;

  const result = zodSchema.safeParse(params);
  if (result.success) return result.data as Record<string, unknown>;

  const issues = result.error.issues.map(
    (e: { path: readonly PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`
  );
  throw new ParamValidationError(commandName, issues);
}

export function extractParamSchema(
  commandName: string
): { fields: Record<string, ParamFieldInfo> } | null {
  const def = commands[commandName];
  if (!def?.schema) return null;

  const shape = extractShape(def.schema);
  if (!shape) return null;

  const fields: Record<string, ParamFieldInfo> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    fields[key] = describeField(fieldSchema);
  }
  return { fields };
}

export interface ParamFieldInfo {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'unknown';
  required: boolean;
  default?: unknown;
  enumValues?: string[];
  description?: string;
  itemType?: ParamFieldInfo;
}

interface ZodDef {
  type?: string;
  shape?: Record<string, unknown>;
  innerType?: unknown;
  defaultValue?: () => unknown;
  values?: readonly string[];
  value?: unknown;
  element?: unknown;
  checks?: Array<{ type?: string; values?: readonly string[] }>;
  typeName?: string;
}

function getDef(schema: unknown): ZodDef | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const obj = schema as Record<string, unknown>;
  const raw = obj.z4 ?? obj._def ?? obj.def;
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;

  if (d.type === 'enum' && !d.values) {
    const entries = d.entries as Record<string, string> | undefined;
    const options = (schema as { options?: readonly string[] }).options;
    if (options) {
      return { ...d, values: [...options] } as ZodDef;
    }
    if (entries) {
      return { ...d, values: Object.keys(entries) } as ZodDef;
    }
  }

  return d as ZodDef;
}

function extractShape(schema: ZodSchema): Record<string, unknown> | null {
  const obj = schema as unknown as Record<string, unknown>;
  const raw = obj.z4 ?? obj._def ?? obj.def;
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.shape) return d.shape as Record<string, unknown>;
  return null;
}

function describeField(fieldSchema: unknown): ParamFieldInfo {
  const def = getDef(fieldSchema);
  if (!def) return { type: 'unknown', required: true };

  const info = describeDef(def);

  if (def.defaultValue !== undefined) {
    info.required = false;
    try {
      info.default = def.defaultValue();
    } catch {
      // ignore
    }
  }

  return info;
}

function describeDef(def: ZodDef): ParamFieldInfo {
  const typeStr = def.type ?? def.typeName ?? '';

  if (typeStr === 'optional') {
    const inner = describeField(def.innerType);
    inner.required = false;
    return inner;
  }

  if (typeStr === 'default') {
    const inner = describeField(def.innerType);
    inner.required = false;
    try {
      inner.default = def.defaultValue?.();
    } catch {
      // ignore
    }
    return inner;
  }

  if (typeStr === 'enum') {
    return {
      type: 'enum',
      required: true,
      enumValues: def.values ? [...def.values] : [],
    };
  }

  if (typeStr === 'array') {
    const itemDef = def.element ? getDef(def.element) : undefined;
    return {
      type: 'array',
      required: true,
      itemType: itemDef ? describeDef(itemDef) : { type: 'unknown', required: true },
    };
  }

  if (typeStr === 'boolean') return { type: 'boolean', required: true };
  if (typeStr === 'number') return { type: 'number', required: true };
  if (typeStr === 'string') return { type: 'string', required: true };
  if (typeStr === 'object') return { type: 'object', required: true };

  return { type: 'unknown', required: true };
}
