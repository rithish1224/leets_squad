/** Normalize any date value from API (ISO string, Date, YYYY-MM-DD) to YYYY-MM-DD */
export function toDateKey(value: unknown): string {
  if (!value) return '';
  const str = String(value);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str.slice(0, 10);
}

/** Short axis label: May 30 (timezone-safe - treats YYYY-MM-DD as date-only, no timezone conversion) */
export function formatAxisDate(value: unknown): string {
  const key = toDateKey(value);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  // Use UTC to avoid timezone offset issues - since backend sends date-only strings adjusted for user's timezone
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Full tooltip label: May 30, 2026 (timezone-safe) */
export function formatTooltipDate(value: unknown): string {
  const key = toDateKey(value);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const [y, m, d] = key.split('-').map(Number);
  // Use UTC to avoid timezone offset issues
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function isDateLike(value: unknown): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value));
}

/** Week label from week_start date */
export function formatWeekLabel(value: unknown): string {
  const key = toDateKey(value);
  if (!key) return '';
  return `Week of ${formatAxisDate(key)}`;
}
