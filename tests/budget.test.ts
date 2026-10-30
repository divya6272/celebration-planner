import { describe, expect, it } from 'vitest';
import { PRIORITY_BOOST, allocate, buildBudget } from '../src/planner/budget.js';
import { TEMPLATES } from '../src/planner/templates.js';
import { EVENT_TYPES } from '../src/planner/types.js';

describe('allocate', () => {
  it('always sums exactly to the total', () => {
    for (const total of [1, 7, 100, 999, 1_234_567]) {
      const parts = allocate(total, [0.22, 0.28, 0.12, 0.09, 0.08, 0.06, 0.02, 0.03, 0.1]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
    }
  });

  it('is proportional for clean splits', () => {
    expect(allocate(100, [1, 1, 2])).toEqual([25, 25, 50]);
  });

  it('gives leftover units to the largest remainders', () => {
    expect(allocate(10, [1, 1, 1])).toEqual([4, 3, 3]);
  });

  it('rejects invalid arguments', () => {
    expect(() => allocate(-1, [1])).toThrow(RangeError);
    expect(() => allocate(1.5, [1])).toThrow(RangeError);
    expect(() => allocate(10, [])).toThrow(RangeError);
    expect(() => allocate(10, [0, 0])).toThrow(RangeError);
    expect(() => allocate(10, [-1, 2])).toThrow(RangeError);
  });
});

describe('templates', () => {
  it.each(EVENT_TYPES)('%s category weights sum to 1', (type) => {
    const sum = TEMPLATES[type].categories.reduce((s, c) => s + c.weight, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it.each(EVENT_TYPES)('%s has unique category and milestone ids', (type) => {
    const t = TEMPLATES[type];
    expect(new Set(t.categories.map((c) => c.id)).size).toBe(t.categories.length);
    expect(new Set(t.milestones.map((m) => m.id)).size).toBe(t.milestones.length);
  });

  it.each(EVENT_TYPES)('%s milestones only reference real categories', (type) => {
    const t = TEMPLATES[type];
    const ids = new Set(t.categories.map((c) => c.id));
    for (const m of t.milestones) {
      if (m.categoryId) expect(ids.has(m.categoryId)).toBe(true);
    }
  });
});

describe('buildBudget', () => {
  it.each(EVENT_TYPES)('%s: lines sum to the total and keep contingency', (type) => {
    const lines = buildBudget(1_500_000, TEMPLATES[type].categories, []);
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(1_500_000);
    const contingency = lines.find((l) => l.categoryId === 'contingency');
    expect(contingency?.amount).toBeGreaterThan(0);
  });

  it('boosts priority categories without changing contingency or the total', () => {
    const base = buildBudget(1_000_000, TEMPLATES.wedding.categories, []);
    const boosted = buildBudget(1_000_000, TEMPLATES.wedding.categories, ['food']);

    const catering = (lines: typeof base) => lines.find((l) => l.categoryId === 'catering');
    expect(catering(boosted)?.amount).toBeGreaterThan(catering(base)?.amount ?? 0);
    expect(catering(boosted)?.isPriority).toBe(true);
    expect(boosted.find((l) => l.categoryId === 'contingency')?.amount).toBe(
      base.find((l) => l.categoryId === 'contingency')?.amount,
    );
    expect(boosted.reduce((s, l) => s + l.amount, 0)).toBe(1_000_000);
    expect(PRIORITY_BOOST).toBeGreaterThan(1);
  });

  it('handles very small budgets without negative or lost amounts', () => {
    const lines = buildBudget(100, TEMPLATES.community.categories, ['venue', 'food', 'decor']);
    expect(lines.every((l) => l.amount >= 0)).toBe(true);
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(100);
  });

  it('reports percentages that round to about 100', () => {
    const lines = buildBudget(1_500_000, TEMPLATES.birthday.categories, []);
    const pct = lines.reduce((s, l) => s + l.percent, 0);
    expect(pct).toBeGreaterThan(99.5);
    expect(pct).toBeLessThan(100.5);
  });
});
