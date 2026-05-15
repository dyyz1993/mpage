import { z } from 'zod/v4';

export function unquote(str: string): string {
  if (str.length >= 2) {
    const first = str[0];
    const last = str[str.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return str.slice(1, -1);
    }
  }
  return str;
}

function isStringLike(field: unknown): boolean {
  if (field instanceof z.ZodString) return true;
  if (field instanceof z.ZodOptional) return isStringLike(field.unwrap());
  if (field instanceof z.ZodDefault) {
    return isStringLike((field as z.ZodDefault<z.ZodType>)._def.innerType);
  }
  return false;
}

export function extractPositionalParams(schema: z.ZodType): string[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  const result: string[] = [];
  for (const key of Object.keys(shape)) {
    if (isStringLike(shape[key])) {
      result.push(key);
    }
  }
  return result;
}

function unwrapField(field: unknown): unknown {
  if (field instanceof z.ZodOptional) return unwrapField(field.unwrap());
  if (field instanceof z.ZodDefault) {
    return unwrapField((field as z.ZodDefault<z.ZodType>)._def.innerType);
  }
  return field;
}

function isOptionalNumber(field: unknown): boolean {
  if (field instanceof z.ZodOptional) {
    const inner = unwrapField(field.unwrap());
    return inner instanceof z.ZodNumber;
  }
  return false;
}

function coerceValue(raw: string, field: unknown): { value: unknown; skip: boolean } {
  const inner = unwrapField(field);
  const optionalNum = isOptionalNumber(field);

  if (inner instanceof z.ZodString) {
    return { value: unquote(raw), skip: false };
  }

  if (inner instanceof z.ZodNumber) {
    const parsed = Number(raw);
    if (isNaN(parsed)) {
      if (optionalNum) return { value: undefined, skip: true };
      return { value: raw, skip: false };
    }
    return { value: parsed, skip: false };
  }

  if (inner instanceof z.ZodBoolean) {
    if (raw === 'true' || raw === '1') return { value: true, skip: false };
    if (raw === 'false' || raw === '0') return { value: false, skip: false };
    return { value: raw, skip: false };
  }

  return { value: unquote(raw), skip: false };
}

export function mapPositionalValues(
  schema: z.ZodType,
  positional: string[],
  existing: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  if (!(schema instanceof z.ZodObject)) return result;

  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  const keys = Object.keys(shape);

  let pIdx = 0;

  for (const key of keys) {
    if (pIdx >= positional.length) break;

    if (result[key] !== undefined) {
      pIdx++;
      continue;
    }

    const field = shape[key];
    const raw = positional[pIdx];
    const { value, skip } = coerceValue(raw, field);

    if (skip) continue;

    result[key] = value;
    pIdx++;
  }

  return result;
}
