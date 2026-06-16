export type TipLevel = 'info' | 'warn' | 'error';

export interface Tip {
  level: TipLevel;
  message: string;
  label?: string;
}

export class TipCollector {
  private items: Tip[] = [];

  info(message: string, label?: string): void {
    this.items.push({ level: 'info', message, label });
  }

  warn(message: string, label?: string): void {
    this.items.push({ level: 'warn', message, label });
  }

  error(message: string, label?: string): void {
    this.items.push({ level: 'error', message, label });
  }

  get collected(): Tip[] {
    return this.items;
  }
}

export function normalizeTip(t: string | Tip): Tip {
  return typeof t === 'string' ? { level: 'info', message: t } : t;
}

export function normalizeTips(tips: Array<string | Tip> | undefined): Tip[] {
  if (!tips) return [];
  return tips.map(normalizeTip);
}

export const tip = {
  info: (message: string, label?: string): Tip => ({ level: 'info', message, label }),
  warn: (message: string, label?: string): Tip => ({ level: 'warn', message, label }),
  error: (message: string, label?: string): Tip => ({ level: 'error', message, label }),
};
