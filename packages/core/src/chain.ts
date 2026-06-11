export type ChainOperator = '&&' | '||' | ';' | ',' | '->' | '+';

export interface ChainStep {
  command: string;
  args: string[];
}

export interface ParsedChain {
  groups: ChainGroup[];
}

export interface ChainGroup {
  operator: ChainOperator;
  steps: ChainStep[];
}

export interface ChainStepResult {
  command: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface ChainResult {
  success: boolean;
  steps: ChainStepResult[];
  totalDuration: number;
  stoppedAt?: number;
  stoppedReason?: string;
}

function splitRespectingQuotes(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      }
      current += ch;
      i++;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      }
      current += ch;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      current += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      current += ch;
      i++;
      continue;
    }

    const rest = input.slice(i);
    const opMatch = rest.match(/^(&&|\|\||->|[;,+])/);

    if (opMatch) {
      const op = opMatch[1];
      // Require space around -> and + to avoid false matches
      if ((op === '->' || op === '+') && !isSpaceAround(input, i, op.length)) {
        current += ch;
        i++;
        continue;
      }
      if (current.trim()) {
        tokens.push(current.trim());
      }
      tokens.push(op);
      i += opMatch[0].length;
      current = '';
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

function isSpaceAround(input: string, pos: number, tokenLen: number): boolean {
  const before = pos > 0 && input[pos - 1] === ' ';
  const after = pos + tokenLen < input.length && input[pos + tokenLen] === ' ';
  return before || after;
}

function parseCommandSegment(segment: string): ChainStep {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
        tokens.push(current);
        current = '';
      } else {
        current += ch;
      }
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
        tokens.push(current);
        current = '';
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return {
    command: tokens[0] || '',
    args: tokens.slice(1),
  };
}

export function parseChain(input: string): ParsedChain {
  const trimmed = input.trim();
  if (!trimmed) {
    return { groups: [] };
  }

  const tokens = splitRespectingQuotes(trimmed);
  const groups: ChainGroup[] = [];
  let currentSteps: ChainStep[] = [];
  let currentOperator: ChainOperator | null = null;

  for (const token of tokens) {
    if (
      token === '&&' ||
      token === '||' ||
      token === ';' ||
      token === ',' ||
      token === '->' ||
      token === '+'
    ) {
      const op = token as ChainOperator;
      if (currentOperator !== null && currentOperator !== op && currentSteps.length > 0) {
        groups.push({ operator: currentOperator, steps: [...currentSteps] });
        currentSteps = [];
      }
      currentOperator = op;
    } else {
      currentSteps.push(parseCommandSegment(token));
    }
  }

  if (currentSteps.length > 0) {
    groups.push({ operator: currentOperator || ';', steps: currentSteps });
  }

  return { groups };
}

function isOperator(token: string): token is ChainOperator {
  return (
    token === '&&' ||
    token === '||' ||
    token === ';' ||
    token === ',' ||
    token === '->' ||
    token === '+'
  );
}

export { isOperator };

export async function executeChain(
  chain: ParsedChain,
  executor: (command: string, args: string[]) => Promise<{ success: boolean; error?: string }>,
  options?: { onStep?: (step: ChainStepResult) => void }
): Promise<ChainResult> {
  const startTime = Date.now();
  const results: ChainStepResult[] = [];

  if (chain.groups.length === 0) {
    return {
      success: true,
      steps: [],
      totalDuration: Date.now() - startTime,
    };
  }

  for (const group of chain.groups) {
    const { operator, steps } = group;

    if (operator === ',') {
      const parallelResults = await Promise.allSettled(
        steps.map(async (step) => {
          const stepStart = Date.now();
          try {
            const result = await executor(step.command, step.args);
            const stepResult: ChainStepResult = {
              command: step.command,
              success: result.success,
              duration: Date.now() - stepStart,
              error: result.error,
            };
            options?.onStep?.(stepResult);
            return stepResult;
          } catch (err) {
            const stepResult: ChainStepResult = {
              command: step.command,
              success: false,
              duration: Date.now() - stepStart,
              error: err instanceof Error ? err.message : String(err),
            };
            options?.onStep?.(stepResult);
            return stepResult;
          }
        })
      );

      for (const r of parallelResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value);
        }
      }
      continue;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();
      let stepResult: ChainStepResult;

      try {
        const result = await executor(step.command, step.args);
        stepResult = {
          command: step.command,
          success: result.success,
          duration: Date.now() - stepStart,
          error: result.error,
        };
      } catch (err) {
        stepResult = {
          command: step.command,
          success: false,
          duration: Date.now() - stepStart,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      results.push(stepResult);
      options?.onStep?.(stepResult);

      if (operator === '&&' && !stepResult.success) {
        return {
          success: false,
          steps: results,
          totalDuration: Date.now() - startTime,
          stoppedAt: results.length - 1,
          stoppedReason: 'AND operator: previous step failed',
        };
      }

      if (operator === '||' && stepResult.success) {
        return {
          success: true,
          steps: results,
          totalDuration: Date.now() - startTime,
          stoppedAt: results.length - 1,
          stoppedReason: 'OR operator: previous step succeeded',
        };
      }
    }
  }

  const anyFailed = results.some((r) => !r.success);
  return {
    success: !anyFailed,
    steps: results,
    totalDuration: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Command argument parsing utilities
// ---------------------------------------------------------------------------

/**
 * Split a command string into whitespace-separated tokens, respecting quotes.
 */
export function splitCommand(cmdStr: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote: "'" | '"' | null = null;

  for (let i = 0; i < cmdStr.length; i++) {
    const char = cmdStr[i];

    if (!inQuote && (char === "'" || char === '"')) {
      inQuote = char;
      current += char;
      continue;
    }

    if (inQuote && char === inQuote) {
      inQuote = null;
      current += char;
      continue;
    }

    if (!inQuote && /\s/.test(char)) {
      if (current.trim()) {
        parts.push(current.trim());
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

const SHORT_FLAG_MAP: Record<string, string> = {
  s: 'selector',
  v: 'value',
};

interface CommandDef {
  positional: string[];
}

const commandDefCache: Record<string, CommandDef> = {};

function getCommandDefinitions(): Record<string, CommandDef> {
  return commandDefCache;
}

/**
 * Register positional parameter names for a command used by {@link parseCommandArgs}.
 *
 * @param name - The command name.
 * @param positional - Ordered array of positional parameter names.
 */
export function registerCommandDefinition(name: string, positional: string[]): void {
  commandDefCache[name] = { positional };
}

/**
 * Parse positional and flagged arguments into a parameter object.
 *
 * Supports `--key value`, `-s value` (short flags), and positional arguments
 * mapped via registered command definitions. Values are automatically coerced
 * to boolean, number, or string.
 */
/**
 * Simple unquote: strip matching leading+trailing single or double quotes.
 */
function stripQuotes(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerceValue(raw: string): unknown {
  const v = stripQuotes(raw);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  if (/^\d+\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

export function parseCommandArgs(
  name: string,
  args: string[],
  unquoteFn?: (raw: string) => string
): { command: string; params: Record<string, unknown> } {
  const definitions = getCommandDefinitions();
  const def = definitions[name];
  const positionalKeys = def ? def.positional : [];
  const params: Record<string, unknown> = {};
  let positionalIndex = 0;
  const unq = unquoteFn ?? stripQuotes;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    const arg = unq(raw);

    if (raw.startsWith('--')) {
      const key = raw.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        params[key] = coerceValue(value);
        i++;
      } else {
        params[key] = true;
      }
    } else if (raw.startsWith('-') && raw.length === 2) {
      const flag = raw[1];
      const mappedKey = SHORT_FLAG_MAP[flag];
      const value = args[i + 1];
      if (mappedKey && value && !value.startsWith('-')) {
        params[mappedKey] = coerceValue(value);
        i++;
      } else if (value && !value.startsWith('-')) {
        params[flag] = coerceValue(value);
        i++;
      } else {
        params[mappedKey || flag] = true;
      }
    } else {
      if (positionalIndex < positionalKeys.length) {
        params[positionalKeys[positionalIndex]] = arg;
        positionalIndex++;
      }
    }
  }

  return { command: name, params };
}
