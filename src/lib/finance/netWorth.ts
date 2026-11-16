import type { Account, Transaction } from '@/types';
import { isLiabilityAccount } from './accountCalculations';
import { addMoney, subtractMoney, roundCurrency } from './money';

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidBalance: number;
}

/**
 * Calculates Total Assets, Total Liabilities, Net Worth, and Available Liquid Cash.
 * Net Worth = Total Assets - Total Liabilities
 *
 * Liquid Balance strictly includes: checking, savings, and cash accounts.
 * Credit cards and non-liquid investments are excluded from spendable liquid cash.
 */
export function calculateNetWorth(accounts: Account[], fallbackTransactions: Transaction[] = []): NetWorthSummary {
  if (accounts.length > 0) {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let liquidBalance = 0;

    for (const a of accounts) {
      const balance = roundCurrency(a.balance);

      if (isLiabilityAccount(a.type)) {
        // Outstanding debt owed
        totalLiabilities = addMoney(totalLiabilities, Math.max(0, balance));
      } else {
        // Asset accounts
        totalAssets = addMoney(totalAssets, Math.max(0, balance));

        if (a.type === 'checking' || a.type === 'savings' || a.type === 'cash') {
          liquidBalance = addMoney(liquidBalance, Math.max(0, balance));
        }
      }
    }

    const netWorth = subtractMoney(totalAssets, totalLiabilities);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidBalance,
    };
  }

  // Fallback if no accounts configured: derive from transaction ledger
  let net = 0;
  for (const t of fallbackTransactions) {
    if (t.type === 'income') {
      net = addMoney(net, t.amount);
    } else if (t.type === 'expense') {
      net = subtractMoney(net, t.amount);
    }
  }

  return {
    totalAssets: net > 0 ? net : 0,
    totalLiabilities: net < 0 ? Math.abs(net) : 0,
    netWorth: net,
    liquidBalance: net > 0 ? net : 0,
  };
}

