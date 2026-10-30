import { buildBudget } from './budget.js';
import { daysBetween } from './dates.js';
import { TEMPLATES } from './templates.js';
import { buildTimeline } from './timeline.js';
import type { EventInput, EventPlan } from './types.js';
import { buildVendorChecklists } from './vendors.js';

const SHORT_NOTICE_DAYS = 14;

/**
 * Builds the complete, deterministic plan for an event. Pure: the same input and `today` always
 * give the same plan, which makes it easy to test and safe to cache.
 *
 * @param input  Validated event details (see `validation.ts`).
 * @param today  Current calendar date as `YYYY-MM-DD`, injected so tests control time.
 */
export function buildPlan(input: EventInput, today: string): EventPlan {
  const template = TEMPLATES[input.eventType];
  const totalBudget = Math.round(input.totalBudget);
  const daysUntilEvent = daysBetween(today, input.eventDate);

  const budget = buildBudget(totalBudget, template.categories, input.priorities);
  const { milestones, compressed } = buildTimeline(template.milestones, input.eventDate, today);
  const vendors = buildVendorChecklists(template.categories, budget, {
    vegetarianOnly: input.vegetarianOnly,
    accessibilityNeeds: input.accessibilityNeeds,
  });

  const warnings: string[] = [];
  if (compressed) {
    warnings.push(
      `Your event is ${daysUntilEvent} days away, sooner than the ideal planning window. ` +
        'Deadlines have been compressed, so book the venue and caterer first.',
    );
  }
  if (daysUntilEvent < SHORT_NOTICE_DAYS) {
    warnings.push('Very short notice: confirm vendor availability before committing to anything.');
  }
  const unusedPriorities = input.priorities.filter(
    (focus) => !template.categories.some((category) => category.focus === focus),
  );
  if (unusedPriorities.length > 0) {
    warnings.push(
      `No budget category matches your focus on "${unusedPriorities.join('", "')}" for this event type, so it was not applied.`,
    );
  }

  return {
    summary: {
      eventType: input.eventType,
      eventLabel: template.label,
      guestCount: input.guestCount,
      totalBudget,
      currency: input.currency,
      perGuest: Math.round(totalBudget / input.guestCount),
      eventDate: input.eventDate,
      daysUntilEvent,
      ...(input.city ? { city: input.city } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
    },
    budget,
    timeline: milestones,
    vendors,
    warnings,
  };
}
