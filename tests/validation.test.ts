import { describe, expect, it } from 'vitest';
import { cleanText, parseEventInput } from '../src/validation.js';
import { TODAY } from './fixtures.js';

const valid = {
  eventType: 'birthday',
  guestCount: 30,
  totalBudget: 50_000,
  eventDate: '2026-12-01',
};

function issuesFor(body: unknown): Record<string, string> {
  const result = parseEventInput(body, TODAY);
  if (result.success) return {};
  return Object.fromEntries(result.issues.map((i) => [i.field, i.message]));
}

describe('parseEventInput', () => {
  it('accepts a minimal valid body and applies defaults', () => {
    const result = parseEventInput(valid, TODAY);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('INR');
      expect(result.data.priorities).toEqual([]);
      expect(result.data.vegetarianOnly).toBe(false);
      expect(result.data.accessibilityNeeds).toBe(false);
    }
  });

  it('accepts an event today but not yesterday', () => {
    expect(parseEventInput({ ...valid, eventDate: TODAY }, TODAY).success).toBe(true);
    expect(issuesFor({ ...valid, eventDate: '2026-10-28' }).eventDate).toMatch(/past/);
  });

  it('rejects impossible and far-future dates', () => {
    expect(issuesFor({ ...valid, eventDate: '2026-02-30' }).eventDate).toMatch(/valid event date/);
    expect(issuesFor({ ...valid, eventDate: '2040-01-01' }).eventDate).toMatch(/5 years/);
    expect(issuesFor({ ...valid, eventDate: 'tomorrow' }).eventDate).toBeDefined();
  });

  it.each([
    ['guestCount', 0],
    ['guestCount', 2001],
    ['guestCount', 10.5],
    ['guestCount', '30'],
    ['totalBudget', 99],
    ['totalBudget', 1e12],
    ['totalBudget', -5],
    ['totalBudget', null],
  ])('rejects %s = %s', (field, value) => {
    expect(issuesFor({ ...valid, [field]: value })[field]).toBeDefined();
  });

  it('rejects unknown event types, currencies and focus areas', () => {
    expect(issuesFor({ ...valid, eventType: 'funeral' }).eventType).toBeDefined();
    expect(issuesFor({ ...valid, currency: 'XYZ' }).currency).toBeDefined();
    expect(Object.keys(issuesFor({ ...valid, priorities: ['gold'] })).join()).toMatch(/priorities/);
  });

  it('limits priorities to 3 and removes duplicates', () => {
    expect(
      Object.keys(
        issuesFor({ ...valid, priorities: ['food', 'venue', 'decor', 'memories'] }),
      ).join(),
    ).toMatch(/priorities/);
    const result = parseEventInput({ ...valid, priorities: ['food', 'food', 'venue'] }, TODAY);
    expect(result.success && result.data.priorities).toEqual(['food', 'venue']);
  });

  it('rejects unknown fields (strict) so nothing unexpected reaches the prompt', () => {
    expect(parseEventInput({ ...valid, isAdmin: true }, TODAY).success).toBe(false);
  });

  it('rejects non-object bodies', () => {
    for (const body of [undefined, null, 'text', 42, []]) {
      expect(parseEventInput(body, TODAY).success).toBe(false);
    }
  });

  it('cleans free text and turns blank text into undefined', () => {
    const result = parseEventInput(
      { ...valid, city: '  New \n\t Delhi  ', theme: '   ', notes: 'line1\u0000\nline2' },
      TODAY,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe('New Delhi');
      expect(result.data.theme).toBeUndefined();
      expect(result.data.notes).toBe('line1 line2');
    }
  });

  it('enforces text length limits', () => {
    expect(issuesFor({ ...valid, city: 'x'.repeat(81) }).city).toBeDefined();
    expect(issuesFor({ ...valid, notes: 'x'.repeat(501) }).notes).toBeDefined();
  });
});

describe('cleanText', () => {
  it('collapses whitespace and strips control characters', () => {
    expect(cleanText(' a\u0007  b\r\nc ')).toBe('a b c');
  });
});
