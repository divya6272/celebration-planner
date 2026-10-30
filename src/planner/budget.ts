import type { BudgetLine, FocusArea } from './types.js';
import type { CategoryTemplate } from './templates.js';

/** A priority category receives this multiple of its normal weight before normalising. */
export const PRIORITY_BOOST = 1.3;
export const CONTINGENCY_ID = 'contingency';

/**
 * Splits `total` (a whole number) into integer parts proportional to `weights` using the
 * largest-remainder method, so the parts always add up to exactly `total`.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total) || total < 0)
    throw new RangeError('total must be a whole number >= 0');
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weights.length === 0 || weights.some((w) => w < 0) || weightSum <= 0) {
    throw new RangeError('weights must be non-negative with a positive sum');
  }

  const exact = weights.map((w) => (total * w) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = total - parts.reduce((sum, p) => sum + p, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    leftover -= 1;
  }
  return parts;
}

/**
 * Builds the budget breakdown. Contingency keeps its fixed share; the remaining share is divided
 * across the other categories by weight, boosted for categories matching the host's priorities.
 */
export function buildBudget(
  total: number,
  categories: readonly CategoryTemplate[],
  priorities: readonly FocusArea[],
): BudgetLine[] {
  const contingency = categories.find((c) => c.id === CONTINGENCY_ID);
  const contingencyShare = contingency?.weight ?? 0;
  const regular = categories.filter((c) => c.id !== CONTINGENCY_ID);

  const isPriority = (c: CategoryTemplate): boolean =>
    c.focus !== undefined && priorities.includes(c.focus);

  const boosted = regular.map((c) => c.weight * (isPriority(c) ? PRIORITY_BOOST : 1));
  const boostedSum = boosted.reduce((sum, w) => sum + w, 0);
  const regularShare = 1 - contingencyShare;
  const weights = boosted.map((w) => (w / boostedSum) * regularShare);

  const ordered = contingency ? [...regular, contingency] : regular;
  const orderedWeights = contingency ? [...weights, contingencyShare] : weights;
  const amounts = allocate(total, orderedWeights);

  return ordered.map((category, i) => ({
    categoryId: category.id,
    label: category.label,
    amount: amounts[i] ?? 0,
    percent: Math.round(((amounts[i] ?? 0) / total) * 1000) / 10,
    isPriority: isPriority(category),
    tip: category.tip,
  }));
}
