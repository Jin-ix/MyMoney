import type { Transaction } from '@/types';
import { addMoney, subtractMoney } from './money';

export interface CashFlowSummary {
  operatingIncome: number;
  operatingExpenses: number;
  netCashFlow: number;
  savingsRate: number | null;
  transferVolume: number;
}

/**
 * Checks whether a transaction represents an internal capital movement (transfer between own accounts or debt repayment)
 * rather than an external operating income or expense.
 */
export function isInternalTransfer(tx: Transaction): boolean {
  return (
    (tx.type as string) === 'transfer' ||
    (tx.type as string) === 'payment' ||
    tx.category === 'transfer' ||
    tx.category === 'cc_payment' ||
    Boolean((tx as any).transferId) ||
    Boolean((tx as any).isRepayment)
  );
}

/**
 * Calculates Operating Income, Operating Expenses, Net Cash Flow, and Savings Rate.
 * Internal capital transfers and credit card repayments are excluded from operating income and operating expenses.
 */
export function calculateCashFlow(transactions: Transaction[]): CashFlowSummary {
  let operatingIncome = 0;
  let operatingExpenses = 0;
  let transferVolume = 0;

  for (const t of transactions) {
    if (isInternalTransfer(t)) {
      transferVolume = addMoney(transferVolume, t.amount);
      continue;
    }

    if (t.type === 'income') {
      operatingIncome = addMoney(operatingIncome, t.amount);
    } else if (t.type === 'expense') {
      operatingExpenses = addMoney(operatingExpenses, t.amount);
    }
  }

  const netCashFlow = subtractMoney(operatingIncome, operatingExpenses);
  const savingsRate =
    operatingIncome > 0
      ? Math.round((netCashFlow / operatingIncome) * 100)
      : null;

  return {
    operatingIncome,
    operatingExpenses,
    netCashFlow,
    savingsRate,
    transferVolume,
  };
}

