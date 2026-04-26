export interface ParsedPipeline {
  pipeline: string[];
  type: 'sequence' | 'and';
}

export function parseCommandChain(input: string): ParsedPipeline[] {
  const result: ParsedPipeline[] = [];
  let currentPipeline: string[] = [];
  let inQuote: "'" | '"' | null = null;
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = char;
      current += char;
      continue;
    }
    if (inQuote && char === inQuote) {
      inQuote = null;
      current += char;
      continue;
    }
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (!inQuote && parenDepth === 0) {
      if (char === '&' && input[i + 1] === '&') {
        if (current.trim()) currentPipeline.push(current.trim());
        current = '';
        i++;
        continue;
      }
      if (char === ';') {
        if (current.trim()) currentPipeline.push(current.trim());
        if (currentPipeline.length > 0) {
          result.push({ pipeline: currentPipeline, type: 'sequence' });
        }
        currentPipeline = [];
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) currentPipeline.push(current.trim());
  if (currentPipeline.length > 0) result.push({ pipeline: currentPipeline, type: 'and' });
  return result;
}

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
