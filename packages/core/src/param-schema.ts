import type { ZodSchema } from './protocol/plugin-protocol.js';
import type { CommandEntry } from './protocol/plugin-protocol.js';

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
  defaultValue?: unknown;
  element?: unknown;
  entries?: Record<string, string>;
}

function getDef(schema: unknown): ZodDef | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const obj = schema as Record<string, unknown>;
  const raw = obj._def ?? obj.def;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as ZodDef;
}

function extractShape(schema: ZodSchema): Record<string, unknown> | null {
  const def = getDef(schema);
  if (!def?.shape) return null;
  return def.shape as Record<string, unknown>;
}

function getDescription(schema: unknown): string | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const desc = (schema as Record<string, unknown>).description;
  return typeof desc === 'string' ? desc : undefined;
}

function describeField(fieldSchema: unknown): ParamFieldInfo {
  const def = getDef(fieldSchema);
  if (!def) return { type: 'unknown', required: true };

  const description = getDescription(fieldSchema);
  const info = describeDef(def, fieldSchema);

  if (description) {
    info.description = description;
  }

  if (def.type === 'default') {
    info.required = false;
    info.default = def.defaultValue;
  }

  return info;
}

function describeDef(def: ZodDef, schema?: unknown): ParamFieldInfo {
  const typeStr = def.type ?? '';

  if (typeStr === 'optional') {
    const inner = describeField(def.innerType);
    inner.required = false;
    return inner;
  }

  if (typeStr === 'default') {
    const inner = describeField(def.innerType);
    inner.required = false;
    inner.default = def.defaultValue;
    return inner;
  }

  if (typeStr === 'enum') {
    let enumValues: string[] = [];
    if (schema && typeof schema === 'object') {
      const opts = (schema as Record<string, unknown>).options;
      if (Array.isArray(opts)) {
        enumValues = [...opts];
      }
    }
    if (enumValues.length === 0 && def.entries) {
      enumValues = Object.keys(def.entries);
    }
    return {
      type: 'enum',
      required: true,
      enumValues,
    };
  }

  if (typeStr === 'array') {
    const itemDef = def.element ? getDef(def.element) : undefined;
    return {
      type: 'array',
      required: true,
      itemType: itemDef
        ? describeDef(itemDef, def.element as unknown)
        : { type: 'unknown', required: true },
    };
  }

  if (typeStr === 'boolean') return { type: 'boolean', required: true };
  if (typeStr === 'number') return { type: 'number', required: true };
  if (typeStr === 'string') return { type: 'string', required: true };
  if (typeStr === 'object') return { type: 'object', required: true };

  return { type: 'unknown', required: true };
}

export function extractParamFields(schema: ZodSchema): Record<string, ParamFieldInfo> | null {
  if (!schema) return null;

  const shape = extractShape(schema);
  if (!shape) return null;

  const fields: Record<string, ParamFieldInfo> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    fields[key] = describeField(fieldSchema);
  }
  return fields;
}

export function getCommandParamFields(entry: CommandEntry): Record<string, ParamFieldInfo> | null {
  if (!entry.parameters) return null;
  return extractParamFields(entry.parameters);
}
