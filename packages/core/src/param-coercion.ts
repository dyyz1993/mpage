import type { z } from 'zod/v4';

interface ZodFieldDef {
  type?: string;
  shape?: Record<string, unknown>;
  innerType?: unknown;
  defaultValue?: () => unknown;
}

function getFieldDef(field: unknown): ZodFieldDef | undefined {
  if (field === null || typeof field !== 'object') return undefined;
  return (field as { _def: ZodFieldDef })._def;
}

export function coerceCliArgs(
  schema: z.ZodType | undefined,
  rawArgs: Record<string, unknown>
): Record<string, unknown> {
  if (!schema) return rawArgs;

  const def = getFieldDef(schema);
  if (!def || def.type !== 'object' || !def.shape) return rawArgs;

  const shape = def.shape as Record<string, unknown>;
  const coerced: Record<string, unknown> = { ...rawArgs };

  for (const [key, field] of Object.entries(shape)) {
    if (coerced[key] === undefined) continue;

    const fieldDef = getFieldDef(field);
    if (!fieldDef) continue;

    const typeStr = fieldDef.type;
    const innerType = getFieldDef(fieldDef.innerType)?.type;

    const actualType = typeStr === 'default' ? innerType : typeStr;
    const value = coerced[key];

    if (actualType === 'number' && typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num)) coerced[key] = num;
    } else if (actualType === 'boolean' && typeof value === 'string') {
      coerced[key] = value === 'true' || value === '1';
    }
  }

  return coerced;
}
