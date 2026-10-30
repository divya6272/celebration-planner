import { describe, expect, it } from 'vitest';
import { buildPlan } from '../src/planner/plan.js';
import { EVENT_TYPES } from '../src/planner/types.js';
import { TODAY, makeInput } from './fixtures.js';

describe('buildPlan', () => {
  it.each(EVENT_TYPES)('%s: produces a complete, consistent plan', (eventType) => {
    const plan = buildPlan(makeInput({ eventType }), TODAY);

    expect(plan.summary.eventType).toBe(eventType);
    expect(plan.budget.reduce((s, l) => s + l.amount, 0)).toBe(plan.summary.totalBudget);
    expect(plan.timeline.length).toBeGreaterThan(5);
    expect(plan.vendors.length).toBeGreaterThan(3);
    for (const vendor of plan.vendors) {
      const line = plan.budget.find((l) => l.categoryId === vendor.categoryId);
      expect(vendor.budget).toBe(line?.amount);
      expect(vendor.tasks.length).toBeGreaterThan(0);
    }
  });

  it('computes per-guest cost and days until the event', () => {
    const plan = buildPlan(
      makeInput({ totalBudget: 1_000_000, guestCount: 200, eventDate: '2026-11-08' }),
      TODAY,
    );
    expect(plan.summary.perGuest).toBe(5000);
    expect(plan.summary.daysUntilEvent).toBe(10);
  });

  it('is deterministic', () => {
    const input = makeInput({ priorities: ['food', 'decor'] });
    expect(buildPlan(input, TODAY)).toEqual(buildPlan(input, TODAY));
  });

  it('rounds a fractional budget to a whole number', () => {
    const plan = buildPlan(makeInput({ totalBudget: 100_000.6 }), TODAY);
    expect(plan.summary.totalBudget).toBe(100_001);
    expect(plan.budget.reduce((s, l) => s + l.amount, 0)).toBe(100_001);
  });

  it('warns about compressed timelines and short notice', () => {
    const plan = buildPlan(makeInput({ eventDate: '2026-11-05' }), TODAY);
    expect(plan.warnings.some((w) => w.includes('compressed'))).toBe(true);
    expect(plan.warnings.some((w) => w.includes('short notice'))).toBe(true);
  });

  it('has no warnings for a comfortable timeline', () => {
    expect(buildPlan(makeInput({ eventDate: '2027-10-29' }), TODAY).warnings).toEqual([]);
  });

  it('warns when a priority has no matching category for the event type', () => {
    const plan = buildPlan(makeInput({ eventType: 'community', priorities: ['memories'] }), TODAY);
    expect(plan.warnings.some((w) => w.includes('memories'))).toBe(true);
  });

  it('adds dietary and accessibility questions to the right vendors', () => {
    const plan = buildPlan(makeInput({ vegetarianOnly: true, accessibilityNeeds: true }), TODAY);
    const catering = plan.vendors.find((v) => v.categoryId === 'catering');
    const venue = plan.vendors.find((v) => v.categoryId === 'venue');
    expect(catering?.questions[0]).toMatch(/vegetarian/i);
    expect(venue?.questions[0]).toMatch(/step-free/i);

    const plain = buildPlan(makeInput(), TODAY);
    expect(plain.vendors.find((v) => v.categoryId === 'venue')?.questions.join(' ')).not.toMatch(
      /step-free/i,
    );
  });

  it('only includes city and theme in the summary when provided', () => {
    expect(buildPlan(makeInput(), TODAY).summary).not.toHaveProperty('city');
    const plan = buildPlan(makeInput({ city: 'Pune', theme: 'retro' }), TODAY);
    expect(plan.summary.city).toBe('Pune');
    expect(plan.summary.theme).toBe('retro');
  });
});
