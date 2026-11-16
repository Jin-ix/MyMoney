import type { Account, Transaction } from '@/types';
import { calculateBalanceDelta } from './accountCalculations';
import { roundCurrency } from './money';

export interface AccountReconciliationReport {
  accountId: string;
  accountName: string;
  accountType: Account['type'];
  storedBalance: number;
  ledgerNetMovement: number;
  discrepancy: number;
  transactionCount: number;
  isReconciled: boolean;
  status: 'matched' | 'discrepancy_detected' | 'untracked_opening_balance';
  possibleCause?: string;
}

/**
 * Reconciles stored account balances against all recorded transaction ledger movements.
 * Does not overwrite or mutate any account balances.
 */
export function reconcileAccount(
  account: Account,
  transactions: Transaction[],
  knownOpeningBalance?: number
): AccountReconciliationReport {
  const accountTxs = transactions.filter((t) => t.accountId === account.id);
  const opening = knownOpeningBalance ?? account.initialBalance ?? 0;

  let ledgerNetMovement = 0;
  for (const t of accountTxs) {
    const delta = calculateBalanceDelta(account.type, t.type, t.amount, t.transferRole);
    ledgerNetMovement = roundCurrency(ledgerNetMovement + delta);
  }

  const expectedBalance = roundCurrency(opening + ledgerNetMovement);
  const storedBalance = roundCurrency(account.balance);
  const discrepancy = roundCurrency(storedBalance - expectedBalance);

  let status: AccountReconciliationReport['status'] = 'matched';
  let possibleCause: string | undefined;

  if (Math.abs(discrepancy) > 0.001) {
    if (accountTxs.length === 0 && storedBalance !== 0) {
      status = 'untracked_opening_balance';
      possibleCause = 'Account has an initial balance set without explicit opening transactions.';
    } else {
      status = 'discrepancy_detected';
      possibleCause = `Stored balance differs by ${discrepancy > 0 ? '+' : ''}${discrepancy} from ledger transactions. Possible cause: transaction edited or deleted prior to balance recalculation fix.`;
    }
  }

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    storedBalance,
    ledgerNetMovement,
    discrepancy,
    transactionCount: accountTxs.length,
    isReconciled: Math.abs(discrepancy) <= 0.001,
    status,
    possibleCause,
  };
}

/**
 * Reconciles all accounts in the portfolio.
 */
export function reconcileAllAccounts(
  accounts: Account[],
  transactions: Transaction[]
): AccountReconciliationReport[] {
  return accounts.map((acc) => reconcileAccount(acc, transactions));
}

