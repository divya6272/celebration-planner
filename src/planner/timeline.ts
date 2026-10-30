import { daysBetween, subtractDays } from './dates.js';
import type { MilestoneTemplate } from './templates.js';
import type { TimelineMilestone, TimelinePhase } from './types.js';

export interface TimelineResult {
  milestones: TimelineMilestone[];
  /** True when the event is closer than the ideal lead time and dates were squeezed. */
  compressed: boolean;
}

/** Phase is decided by the ideal lead time, so it stays meaningful even after compression. */
export function phaseFor(idealDaysBefore: number): TimelinePhase {
  if (idealDaysBefore === 0) return 'Event day';
  if (idealDaysBefore <= 14) return 'Final countdown';
  if (idealDaysBefore <= 60) return 'Lock in details';
  return 'Plan & book';
}

/**
 * Turns milestone templates into dated tasks working backwards from the event date. If there is
 * less time than the ideal lead, every offset is scaled down proportionally so that no task is
 * scheduled in the past and the order is preserved.
 */
export function buildTimeline(
  templates: readonly MilestoneTemplate[],
  eventDate: string,
  today: string,
): TimelineResult {
  const available = Math.max(0, daysBetween(today, eventDate));
  const idealLead = Math.max(0, ...templates.map((m) => m.daysBefore));
  const compressed = idealLead > 0 && available < idealLead;
  const scale = compressed ? available / idealLead : 1;

  const milestones = templates.map<TimelineMilestone>((m) => {
    const daysBeforeEvent = Math.round(m.daysBefore * scale);
    return {
      id: m.id,
      title: m.title,
      phase: phaseFor(m.daysBefore),
      daysBeforeEvent,
      dueDate: subtractDays(eventDate, daysBeforeEvent),
      categoryId: m.categoryId ?? null,
    };
  });

  // Stable sort: earliest due date first, template order breaks ties.
  const ordered = milestones
    .map((milestone, index) => ({ milestone, index }))
    .sort((a, b) => a.milestone.dueDate.localeCompare(b.milestone.dueDate) || a.index - b.index)
    .map(({ milestone }) => milestone);

  return { milestones: ordered, compressed };
}
