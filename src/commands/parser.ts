import { z } from 'zod/v4';
import type { ZodSchema } from '../types.js';

function unquote(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseNumericValue(value: string): number | string {
  if (/^-?\d+$/.test(value)) {
    const n = parseInt(value, 10);
    return n === 0 ? 0 : n;
  }
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

function looksLikeFlag(s: string): boolean {
  if (!s.startsWith('-')) return false;
  if (s.startsWith('--')) return true;
  if (/^-\d+(\.\d+)?$/.test(s)) return false;
  return /^-[a-zA-Z]/.test(s);
}

export function parseArgsToRecord(args: string[], schema?: ZodSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const shape =
    schema instanceof z.ZodObject
      ? (schema as z.ZodObject<Record<string, z.ZodType<unknown>>>).shape
      : {};
  const paramKeys = Object.keys(shape);
  let positionalIndex = 0;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    const arg = unquote(raw);

    if (arg.startsWith('--') && arg.length > 2) {
      const eqIndex = arg.indexOf('=');
      let key: string;
      let rawValue: string | undefined;

      if (eqIndex !== -1) {
        key = arg.slice(2, eqIndex);
        rawValue = arg.slice(eqIndex + 1);
      } else {
        key = arg.slice(2);
        const next = args[i + 1];
        if (next && !looksLikeFlag(next)) {
          rawValue = next;
          i++;
        }
      }

      if (rawValue !== undefined) {
        const unquotedValue = unquote(rawValue);
        if (unquotedValue === 'true') result[key] = true;
        else if (unquotedValue === 'false') result[key] = false;
        else {
          const num = parseNumericValue(unquotedValue);
          result[key] = num;
        }
      } else {
        result[key] = true;
      }
    } else if (!looksLikeFlag(arg)) {
      while (positionalIndex < paramKeys.length) {
        const key = paramKeys[positionalIndex];
        const fieldSchema = shape[key];

        const isOptional = fieldSchema instanceof z.ZodOptional;

        if (result[key] === undefined) {
          if (isOptional) {
            const innerSchema = (fieldSchema as z.ZodOptional<z.ZodType<unknown>>).unwrap();
            if (innerSchema instanceof z.ZodNumber && !/^-?\d+(\.\d+)?$/.test(arg)) {
              positionalIndex++;
              continue;
            }
          }

          if (fieldSchema instanceof z.ZodNumber) {
            const num = parseNumericValue(arg);
            result[key] = num;
          } else if (fieldSchema instanceof z.ZodBoolean) {
            result[key] = arg === 'true';
          } else if (fieldSchema instanceof z.ZodOptional) {
            const innerSchema = (fieldSchema as z.ZodOptional<z.ZodType<unknown>>).unwrap();
            if (innerSchema instanceof z.ZodNumber) {
              const num = parseNumericValue(arg);
              result[key] = num;
            } else if (innerSchema instanceof z.ZodBoolean) {
              result[key] = arg === 'true';
            } else {
              result[key] = arg;
            }
          } else {
            result[key] = arg;
          }
          positionalIndex++;
          break;
        }
        positionalIndex++;
      }
    }
  }
  return result;
}
