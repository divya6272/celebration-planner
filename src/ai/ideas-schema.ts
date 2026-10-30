import { z } from 'zod';
import type { IdeaSet } from '../planner/types.js';

const line = z.string().trim().min(1).max(400);
const list = (min: number, max: number) => z.array(line).min(min).max(max);

/**
 * The only shape of AI output the app will accept. Anything else (extra prose, wrong types,
 * empty or oversized lists) is rejected and replaced by the fallback ideas.
 */
export const ideaSetSchema = z.object({
  headline: z.string().trim().min(1).max(200),
  themeIdeas: z
    .array(z.object({ title: z.string().trim().min(1).max(80), description: line }))
    .min(1)
    .max(4),
  decorIdeas: list(1, 6),
  menuIdeas: list(1, 6),
  activityIdeas: list(1, 6),
  savingTips: list(1, 6),
});

/** Parses model output text (JSON, optionally wrapped in a Markdown fence) into an `IdeaSet`. */
export function parseIdeaSet(text: string): IdeaSet {
  const json = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return ideaSetSchema.parse(JSON.parse(json));
}
