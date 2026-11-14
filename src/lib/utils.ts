import { format, parse, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval, parseISO } from 'date-fns';

export function formatCurrency(amount: number, symbol = '₹'): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${symbol}${formatted}`;
}

export function formatDate(dateString: string, fmt = 'dd MMM yyyy'): string {
  return format(parseISO(dateString), fmt);
}

export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM');
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthLabel(monthStr: string): string {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return format(date, 'MMMM yyyy');
}

export function getMonthRange(monthStr: string): { start: Date; end: Date } {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getPreviousMonth(monthStr: string): string {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return format(subMonths(date, 1), 'yyyy-MM');
}

export function getNextMonth(monthStr: string): string {
  const date = parse(monthStr, 'yyyy-MM', new Date());
  return format(addMonths(date, 1), 'yyyy-MM');
}

export function isInMonth(dateString: string, monthStr: string): boolean {
  const { start, end } = getMonthRange(monthStr);
  const date = parseISO(dateString);
  return isWithinInterval(date, { start, end });
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

