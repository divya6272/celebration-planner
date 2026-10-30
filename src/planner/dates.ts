/**
 * Calendar-date helpers. Everything is done in UTC on `YYYY-MM-DD` strings so results never
 * depend on the server's time zone or daylight-saving changes.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a strict `YYYY-MM-DD` string. Returns `null` for malformed or non-existent dates. */
export function parseIsoDate(value: string): number | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const ms = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const roundTrip = new Date(ms).toISOString().slice(0, 10);
  return roundTrip === value ? ms : null;
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayIso(now: Date): string {
  return toIsoDate(now.getTime());
}

/** Whole days from `from` to `to` (negative if `to` is earlier). Both must be valid ISO dates. */
export function daysBetween(from: string, to: string): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (a === null || b === null) throw new RangeError(`Invalid ISO date: ${from} / ${to}`);
  return Math.round((b - a) / MS_PER_DAY);
}

export function subtractDays(isoDate: string, days: number): string {
  const ms = parseIsoDate(isoDate);
  if (ms === null) throw new RangeError(`Invalid ISO date: ${isoDate}`);
  return toIsoDate(ms - days * MS_PER_DAY);
}
