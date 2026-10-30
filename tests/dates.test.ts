import { describe, expect, it } from 'vitest';
import { daysBetween, parseIsoDate, subtractDays, todayIso } from '../src/planner/dates.js';

describe('dates', () => {
  it('parses valid ISO dates and rejects malformed or impossible ones', () => {
    expect(parseIsoDate('2026-10-29')).not.toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('29-10-2026')).toBeNull();
    expect(parseIsoDate('2026-10-29T00:00:00Z')).toBeNull();
  });

  it('accepts leap days only in leap years', () => {
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
    expect(parseIsoDate('2027-02-29')).toBeNull();
  });

  it('counts whole days, including across month and year boundaries', () => {
    expect(daysBetween('2026-10-29', '2026-10-29')).toBe(0);
    expect(daysBetween('2026-10-29', '2026-11-01')).toBe(3);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-11-01', '2026-10-29')).toBe(-3);
  });

  it('is not affected by daylight-saving transitions', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('subtracts days', () => {
    expect(subtractDays('2027-03-01', 1)).toBe('2027-02-28');
    expect(subtractDays('2027-01-01', 0)).toBe('2027-01-01');
  });

  it('throws on invalid input', () => {
    expect(() => daysBetween('nope', '2026-01-01')).toThrow(RangeError);
    expect(() => subtractDays('2026-02-31', 1)).toThrow(RangeError);
  });

  it('formats today from a Date in UTC', () => {
    expect(todayIso(new Date('2026-10-29T23:30:00Z'))).toBe('2026-10-29');
  });
});
