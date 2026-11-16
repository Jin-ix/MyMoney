import type { Budget, Transaction } from '@/types';
import { isInternalTransfer } from './cashFlow';
import { addMoney, subtractMoney, roundCurrency } from './money';

export interface CategoryBudgetAnalysis {
  budgetId: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWarning: boolean;
}

/**
 * Computes net expenditure for a specific category within a transaction set.
 * Excludes internal capital transfers and debt payments.
 * Reimbursed income for this category reduces total net expenditure.
 */
export function calculateCategorySpent(
  first: string | Transaction[],
  second: Transaction[] | string
): number {
  const category = typeof first === 'string' ? first : (second as string);
  const transactions = Array.isArray(first) ? first : (second as Transaction[]);
  let spent = 0;

  for (const t of transactions) {
    if (t.category !== category) continue;
    if (isInternalTransfer(t)) continue;

    if (t.type === 'expense') {
      spent = addMoney(spent, t.amount);
    } else if (t.type === 'income') {
      // Reimbursed or refunded amount reduces category spent
      spent = subtractMoney(spent, t.amount);
    }
  }

  return Math.max(0, roundCurrency(spent));
}

/**
 * Analyzes all budgets for a given month against the transactions of that month.
 */
export function analyzeBudgets(budgets: Budget[], monthTransactions: Transaction[], currentMonth: string): CategoryBudgetAnalysis[] {
  return budgets
    .filter((b) => b.month === currentMonth)
    .map((b) => {
      const spent = calculateCategorySpent(b.category, monthTransactions);
      const remaining = subtractMoney(b.allocated, spent);
      const percentage = b.allocated > 0 ? Math.round((spent / b.allocated) * 100) : 0;
      const isOverBudget = remaining < 0;
      const isWarning = percentage >= 80 && !isOverBudget;

      return {
        budgetId: b.id,
        category: b.category,
        allocated: b.allocated,
        spent,
        remaining,
        percentage,
        isOverBudget,
        isWarning,
      };
    });
}
