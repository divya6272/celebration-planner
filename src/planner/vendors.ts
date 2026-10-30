import {
  ACCESSIBILITY_QUESTIONS,
  VEGETARIAN_QUESTION,
  type CategoryTemplate,
} from './templates.js';
import type { BudgetLine, VendorChecklist } from './types.js';

interface VendorOptions {
  vegetarianOnly: boolean;
  accessibilityNeeds: boolean;
}

/**
 * Builds one checklist per bookable category, tied to the budget it was allocated and tailored to
 * the host's dietary and accessibility needs.
 */
export function buildVendorChecklists(
  categories: readonly CategoryTemplate[],
  budget: readonly BudgetLine[],
  options: VendorOptions,
): VendorChecklist[] {
  const amountById = new Map(budget.map((line) => [line.categoryId, line.amount]));

  return categories.flatMap<VendorChecklist>((category) => {
    if (!category.vendor) return [];

    const questions = [...(category.questions ?? [])];
    if (options.vegetarianOnly && category.id === 'catering')
      questions.unshift(VEGETARIAN_QUESTION);
    const accessibilityQuestion = ACCESSIBILITY_QUESTIONS[category.id];
    if (options.accessibilityNeeds && accessibilityQuestion)
      questions.unshift(accessibilityQuestion);

    return [
      {
        categoryId: category.id,
        vendor: category.vendor,
        budget: amountById.get(category.id) ?? 0,
        tasks: [...(category.tasks ?? [])],
        questions,
      },
    ];
  });
}
