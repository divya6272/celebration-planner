/** Shared domain types for the planning engine. Pure data, no behaviour. */

export const EVENT_TYPES = ['wedding', 'birthday', 'community'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Things the host can say matter most; they get a larger slice of the budget. */
export const FOCUS_AREAS = ['food', 'venue', 'decor', 'entertainment', 'memories'] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export interface EventInput {
  eventType: EventType;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  /** ISO calendar date, `YYYY-MM-DD`. */
  eventDate: string;
  city?: string;
  theme?: string;
  notes?: string;
  priorities: FocusArea[];
  vegetarianOnly: boolean;
  accessibilityNeeds: boolean;
}

export interface BudgetLine {
  categoryId: string;
  label: string;
  amount: number;
  /** Share of the total budget, 0-100, one decimal. */
  percent: number;
  isPriority: boolean;
  tip: string;
}

export type TimelinePhase = 'Plan & book' | 'Lock in details' | 'Final countdown' | 'Event day';

export interface TimelineMilestone {
  id: string;
  title: string;
  phase: TimelinePhase;
  /** Days before the event after any compression to fit the available time. */
  daysBeforeEvent: number;
  dueDate: string;
  categoryId: string | null;
}

export interface VendorChecklist {
  categoryId: string;
  vendor: string;
  budget: number;
  tasks: string[];
  questions: string[];
}

export interface PlanSummary {
  eventType: EventType;
  eventLabel: string;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  perGuest: number;
  eventDate: string;
  daysUntilEvent: number;
  city?: string;
  theme?: string;
}

export interface EventPlan {
  summary: PlanSummary;
  budget: BudgetLine[];
  timeline: TimelineMilestone[];
  vendors: VendorChecklist[];
  warnings: string[];
}

export interface IdeaItem {
  title: string;
  description: string;
}

export interface IdeaSet {
  headline: string;
  themeIdeas: IdeaItem[];
  decorIdeas: string[];
  menuIdeas: string[];
  activityIdeas: string[];
  savingTips: string[];
}
