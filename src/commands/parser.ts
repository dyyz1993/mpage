import { z } from "zod";
import type { ZodSchema } from "../types.js";

function unquote(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseArgsToRecord(args: string[], schema?: ZodSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const shape = schema instanceof z.ZodObject ? (schema as z.ZodObject<Record<string, z.ZodType<unknown>>>).shape : {};
  const paramKeys = Object.keys(shape);
  let positionalIndex = 0;

  for (let i = 0; i < args.length; i++) {
    let arg = unquote(args[i]);
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        const unquotedValue = unquote(value);
        if (unquotedValue === "true") result[key] = true;
        else if (unquotedValue === "false") result[key] = false;
        else if (/^\d+$/.test(unquotedValue)) result[key] = parseInt(unquotedValue, 10);
        else if (/^\d+\.\d+$/.test(unquotedValue)) result[key] = parseFloat(unquotedValue);
        else result[key] = unquotedValue;
        i++;
      } else {
        result[key] = true;
      }
    } else if (!args[i].startsWith("-")) {
      while (positionalIndex < paramKeys.length) {
        const key = paramKeys[positionalIndex];
        const fieldSchema = shape[key];
        
        const isOptional = fieldSchema instanceof z.ZodOptional;
        
        if (result[key] === undefined) {
          if (isOptional) {
            const innerSchema = (fieldSchema as z.ZodOptional<z.ZodType<unknown>>).unwrap();
            if (innerSchema instanceof z.ZodNumber && !/^\d+(\.\d+)?$/.test(arg)) {
              positionalIndex++;
              continue;
            }
          }
          
          if (fieldSchema instanceof z.ZodNumber) {
            result[key] = /^\d+\.\d+$/.test(arg) ? parseFloat(arg) : parseInt(arg, 10);
          } else if (fieldSchema instanceof z.ZodBoolean) {
            result[key] = arg === "true";
          } else if (fieldSchema instanceof z.ZodOptional) {
            const innerSchema = (fieldSchema as z.ZodOptional<z.ZodType<unknown>>).unwrap();
            if (innerSchema instanceof z.ZodNumber) {
              result[key] = /^\d+\.\d+$/.test(arg) ? parseFloat(arg) : parseInt(arg, 10);
            } else if (innerSchema instanceof z.ZodBoolean) {
              result[key] = arg === "true";
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
