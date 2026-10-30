import { z } from 'zod';
import { daysBetween, parseIsoDate } from './planner/dates.js';
import { CURRENCIES, EVENT_TYPES, FOCUS_AREAS, type EventInput } from './planner/types.js';

/** Furthest ahead an event can be planned, in days. */
export const MAX_PLANNING_DAYS = 365 * 5;
export const MIN_BUDGET = 100;
export const MAX_BUDGET = 1_000_000_000;
export const MAX_GUESTS = 2000;

/** Collapses whitespace and strips control characters so free text is safe to log and prompt with. */
export function cleanText(value: string): string {
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters`)
    .transform(cleanText)
    .transform((text) => (text === '' ? undefined : text))
    .optional();

/**
 * Builds the request schema. The current date is a parameter (not read inside) so that
 * "date must not be in the past" is deterministic and testable.
 */
export function createEventInputSchema(today: string) {
  return z
    .object({
      eventType: z.enum(EVENT_TYPES, 'Choose wedding, birthday or community'),
      guestCount: z
        .number('Enter the number of guests')
        .int('Guest count must be a whole number')
        .min(1, 'At least 1 guest')
        .max(MAX_GUESTS, `At most ${MAX_GUESTS} guests`),
      totalBudget: z
        .number('Enter your total budget')
        .min(MIN_BUDGET, `Budget must be at least ${MIN_BUDGET}`)
        .max(MAX_BUDGET, 'Budget is too large'),
      currency: z.enum(CURRENCIES, 'Unsupported currency').default('INR'),
      eventDate: z
        .string('Choose the event date')
        .refine((value) => parseIsoDate(value) !== null, 'Choose a valid event date')
        .refine(
          (value) => parseIsoDate(value) === null || daysBetween(today, value) >= 0,
          'The event date cannot be in the past',
        )
        .refine(
          (value) => parseIsoDate(value) === null || daysBetween(today, value) <= MAX_PLANNING_DAYS,
          'The event date must be within 5 years',
        ),
      city: optionalText(80),
      theme: optionalText(100),
      notes: optionalText(500),
      priorities: z
        .array(z.enum(FOCUS_AREAS, 'Unknown focus area'))
        .max(3, 'Choose at most 3 focus areas')
        .default([])
        .transform((list) => [...new Set(list)]),
      vegetarianOnly: z.boolean().default(false),
      accessibilityNeeds: z.boolean().default(false),
    })
    .strict();
}

export interface FieldIssue {
  field: string;
  message: string;
}

export type ParseResult =
  { success: true; data: EventInput } | { success: false; issues: FieldIssue[] };

/** Validates untrusted input, returning typed data or a list of field-level problems. */
export function parseEventInput(body: unknown, today: string): ParseResult {
  const result = createEventInputSchema(today).safeParse(body);
  if (result.success) return { success: true, data: result.data as EventInput };
  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  };
}
