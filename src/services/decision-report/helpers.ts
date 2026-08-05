import { BreakdownRow, ConfidenceLevel } from '../../types/decision-report.types';

export function row(
  input: string,
  value: string,
  impactLabel: string,
  impactType: 'pos' | 'neg' | 'neutral',
  meaning: string
): BreakdownRow {
  return { input, value, impactLabel, impactType, meaning };
}

export const CONFIDENCE_CAPTIONS: Record<ConfidenceLevel, string> = {
  high: 'Based on robust data',
  medium: 'Based on partial data',
  low: 'Indicative estimate only',
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString('en-KE')}`;
}
