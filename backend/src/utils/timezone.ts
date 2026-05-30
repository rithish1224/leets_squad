import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfWeek, subDays, parseISO } from 'date-fns';

export function getTodayInTimezone(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
}

export function getWeekStartInTimezone(timezone: string, date?: Date): string {
  const ref = date ?? new Date();
  const zoned = toZonedTime(ref, timezone);
  const weekStart = startOfWeek(zoned, { weekStartsOn: 1 });
  return formatInTimeZone(weekStart, timezone, 'yyyy-MM-dd');
}

export function utcToDateInTimezone(utcDate: Date | string, timezone: string): string {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

export function isDayComplete(timezone: string): boolean {
  const now = new Date();
  const hour = parseInt(formatInTimeZone(now, timezone, 'H'), 10);
  return hour >= 23;
}

export function getDateRangeForDays(timezone: string, days: number): string[] {
  const dates: string[] = [];
  const today = getTodayInTimezone(timezone);
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(parseISO(today), i);
    dates.push(formatInTimeZone(d, timezone, 'yyyy-MM-dd'));
  }
  return dates;
}

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function capitalizeDifficulty(diff: string): 'Easy' | 'Medium' | 'Hard' {
  const lower = diff.toLowerCase();
  if (lower === 'easy') return 'Easy';
  if (lower === 'medium') return 'Medium';
  return 'Hard';
}
