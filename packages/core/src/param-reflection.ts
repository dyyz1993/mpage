/**
 * Zod Schema 反射工具
 *
 * 将 Zod 3 schema 反射为更结构化的数据，便于：
 * - 表单字段生成（FormField[]）
 * - LLM 友好的 contract 描述
 * - 跨层（CLI / Web UI / LLM Agent）参数序列化
 *
 * 设计原则：
 * 1. 防御性：所有输入都可能为 null/undefined/非 Zod schema
 * 2. 解构链：递归解开 ZodDefault / ZodOptional / ZodNullable
 * 3. 描述聚合：任意层级的 description 都会被收集
 */

export interface ZodUnwrapResult {
  /** 原始 schema（解开包装后） */
  schema: unknown;
  /** 内部类型名，例如 'ZodString' / 'ZodObject' / 'unknown' */
  typeName: string;
  /** 是否可空（optional / nullable / has default） */
  optional: boolean;
  /** 任意层级出现的 description（最近的优先） */
  description?: string;
  /** ZodDefault 提供的默认值（已求值） */
  defaultValue?: unknown;
}

type ZodLike = {
  _def?: {
    typeName?: string;
    description?: string;
    defaultValue?: (() => unknown) | unknown;
    innerType?: unknown;
    type?: unknown;
    values?: unknown;
    shape?: (() => Record<string, unknown>) | Record<string, unknown>;
    element?: unknown;
  };
  shape?: Record<string, unknown> | (() => Record<string, unknown>);
  isOptional?: () => boolean;
  isNullable?: () => boolean;
  description?: string;
};

/** 表单字段契约（与 PluginFormField 对齐的子集） */
export interface ReflectedField {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
  enum?: string[];
  itemType?: { type: string; required: boolean };
  multiple?: boolean;
}

const MAX_UNWRAP_DEPTH = 8;

/**
 * 递归解开 ZodDefault / ZodOptional / ZodNullable，
 * 提取出内部 typeName 与 optional / default / description 标志。
 */
export function unwrapZod(schema: unknown): ZodUnwrapResult {
  if (schema === null || schema === undefined) {
    return { schema, typeName: 'unknown', optional: false };
  }

  if (typeof schema !== 'object') {
    return { schema, typeName: 'unknown', optional: false };
  }

  let current = schema as ZodLike;
  const initialOptional = typeof current.isOptional === 'function' ? current.isOptional() : false;
  let optional = initialOptional;
  let description: string | undefined;
  let defaultValue: unknown;

  for (let i = 0; i < MAX_UNWRAP_DEPTH; i++) {
    const def = current._def;
    if (!def) break;

    const typeName = def.typeName || 'unknown';

    if (def.description) {
      description = def.description;
    }
    if (typeof current.description === 'string' && !description) {
      description = current.description;
    }

    if (typeName === 'ZodDefault') {
      optional = true;
      defaultValue =
        typeof def.defaultValue === 'function'
          ? (def.defaultValue as () => unknown)()
          : def.defaultValue;
      const inner = (def.innerType || def.type) as ZodLike | undefined;
      if (!inner) {
        return { schema: current, typeName, optional, description, defaultValue };
      }
      current = inner;
      continue;
    }

    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
      optional = true;
      const inner = (def.innerType || def.type) as ZodLike | undefined;
      if (!inner) {
        return { schema: current, typeName, optional, description, defaultValue };
      }
      current = inner;
      continue;
    }

    return { schema: current, typeName, optional, description, defaultValue };
  }

  const typeName = current._def?.typeName || 'unknown';
  return { schema: current, typeName, optional, description, defaultValue };
}

/**
 * 将 Zod typeName 映射为 contract 层的 type 字符串。
 */
export function zodTypeToContractType(typeName: string): string {
  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
    case 'ZodNativeEnum':
      return 'enum';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodLiteral':
      return 'literal';
    case 'ZodUnknown':
      return 'unknown';
    default:
      return typeName.replace(/^Zod/, '').toLowerCase() || 'unknown';
  }
}

/**
 * 提取 enum 的字符串值。
 * - ZodEnum: 返回 options 数组
 * - ZodNativeEnum: 返回 keys + string values（去重）
 * - 其它: 返回 undefined
 */
export function extractEnumValues(schema: unknown): string[] | undefined {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return undefined;
  }
  const def = (schema as ZodLike)._def;
  const values = def?.values;
  if (Array.isArray(values)) {
    return values.map(String);
  }
  if (values && typeof values === 'object') {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (!seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
      const valueStr = String(value);
      if (!seen.has(valueStr)) {
        seen.add(valueStr);
        result.push(valueStr);
      }
    }
    return result;
  }
  return undefined;
}

/**
 * 提取 ZodObject 的 shape 字段。
 * - 非 ZodObject: 返回 []
 * - ZodObject: 返回 ReflectedField[]
 */
export function fieldsFromZodObject(schema: unknown): ReflectedField[] {
  const shape = getObjectShape(schema);
  if (!shape) return [];

  return Object.entries(shape).map(([name, fieldSchema]) => fieldFromZod(name, fieldSchema));
}

function getObjectShape(schema: unknown): Record<string, unknown> | undefined {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return undefined;
  }
  const zod = schema as ZodLike;
  const shapeOrFn = zod.shape ?? zod._def?.shape;
  if (!shapeOrFn) return undefined;
  return typeof shapeOrFn === 'function' ? shapeOrFn() : shapeOrFn;
}

function fieldFromZod(name: string, schema: unknown): ReflectedField {
  const unwrapped = unwrapZod(schema);
  const type = zodTypeToContractType(unwrapped.typeName);
  const enumValues = extractEnumValues(unwrapped.schema);

  const field: ReflectedField = {
    name,
    type,
    required: !unwrapped.optional,
  };

  if (unwrapped.description) {
    field.description = unwrapped.description;
  }
  if (unwrapped.defaultValue !== undefined) {
    field.default = unwrapped.defaultValue;
  }
  if (enumValues) {
    field.enum = enumValues;
  }
  if (type === 'array') {
    field.multiple = true;
    const inner = getArrayItemType(unwrapped.schema);
    if (inner) {
      field.itemType = inner;
    }
  }

  return field;
}

function getArrayItemType(schema: unknown): { type: string; required: boolean } | undefined {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return undefined;
  }
  const def = (schema as ZodLike)._def;
  const element = def?.element ?? def?.type;
  if (!element) return undefined;
  const inner = unwrapZod(element);
  return {
    type: zodTypeToContractType(inner.typeName),
    required: !inner.optional,
  };
}
