import type { EventInput } from '../src/planner/types.js';

export const TODAY = '2026-10-29';

export function makeInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    eventType: 'wedding',
    guestCount: 150,
    totalBudget: 1_500_000,
    currency: 'INR',
    eventDate: '2027-03-01',
    priorities: [],
    vegetarianOnly: false,
    accessibilityNeeds: false,
    ...overrides,
  };
}
