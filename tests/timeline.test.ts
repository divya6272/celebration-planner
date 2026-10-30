import { describe, expect, it } from 'vitest';
import { daysBetween } from '../src/planner/dates.js';
import { TEMPLATES } from '../src/planner/templates.js';
import { buildTimeline, phaseFor } from '../src/planner/timeline.js';
import { TODAY } from './fixtures.js';

describe('buildTimeline', () => {
  it('uses ideal lead times when there is plenty of time', () => {
    const { milestones, compressed } = buildTimeline(
      TEMPLATES.wedding.milestones,
      '2027-10-29',
      TODAY,
    );
    expect(compressed).toBe(false);
    const venue = milestones.find((m) => m.id === 'w-venue');
    expect(venue?.daysBeforeEvent).toBe(210);
  });

  it('puts the event day last and due on the event date', () => {
    const { milestones } = buildTimeline(TEMPLATES.birthday.milestones, '2027-01-15', TODAY);
    const last = milestones[milestones.length - 1];
    expect(last?.dueDate).toBe('2027-01-15');
    expect(last?.phase).toBe('Event day');
  });

  it('is sorted by due date', () => {
    for (const type of ['wedding', 'birthday', 'community'] as const) {
      const { milestones } = buildTimeline(TEMPLATES[type].milestones, '2027-06-01', TODAY);
      const dates = milestones.map((m) => m.dueDate);
      expect(dates).toEqual([...dates].sort());
    }
  });

  it('compresses when the event is sooner than the ideal window, never scheduling in the past', () => {
    const eventDate = '2026-12-15'; // 47 days away, wedding wants 240
    const { milestones, compressed } = buildTimeline(
      TEMPLATES.wedding.milestones,
      eventDate,
      TODAY,
    );
    expect(compressed).toBe(true);
    for (const m of milestones) {
      expect(daysBetween(TODAY, m.dueDate)).toBeGreaterThanOrEqual(0);
      expect(daysBetween(m.dueDate, eventDate)).toBe(m.daysBeforeEvent);
    }
    expect(milestones[0]?.dueDate).toBe(TODAY);
  });

  it('handles an event happening today', () => {
    const { milestones, compressed } = buildTimeline(TEMPLATES.community.milestones, TODAY, TODAY);
    expect(compressed).toBe(true);
    expect(milestones.every((m) => m.dueDate === TODAY)).toBe(true);
  });

  it('keeps the original order for equal dates', () => {
    const { milestones } = buildTimeline(TEMPLATES.birthday.milestones, TODAY, TODAY);
    expect(milestones.map((m) => m.id)).toEqual(TEMPLATES.birthday.milestones.map((m) => m.id));
  });
});

describe('phaseFor', () => {
  it.each([
    [0, 'Event day'],
    [1, 'Final countdown'],
    [14, 'Final countdown'],
    [15, 'Lock in details'],
    [60, 'Lock in details'],
    [61, 'Plan & book'],
    [240, 'Plan & book'],
  ])('%i days before -> %s', (days, phase) => {
    expect(phaseFor(days)).toBe(phase);
  });
});
