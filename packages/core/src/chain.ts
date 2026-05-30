export type ChainOperator = '&&' | '||' | ';' | ',';

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
    const opMatch = rest.match(/^(&&|\|\||[;,])\s*/);

    if (opMatch) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      tokens.push(opMatch[1]);
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
    if (token === '&&' || token === '||' || token === ';' || token === ',') {
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
  return token === '&&' || token === '||' || token === ';' || token === ',';
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
