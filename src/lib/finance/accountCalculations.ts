import type { Account, Transaction } from '@/types';
import { roundCurrency } from './money';

/**
 * Checks whether an account type represents an asset (Cash, Bank, Savings, Brokerage).
 */
export function isAssetAccount(type: Account['type']): boolean {
  return type !== 'credit';
}

/**
 * Checks whether an account type represents a liability (Revolving Credit Card, Loan).
 */
export function isLiabilityAccount(type: Account['type']): boolean {
  return type === 'credit';
}

/**
 * Determines the net financial movement (delta) that a transaction produces on an account balance.
 *
 * Balance Conventions:
 * 1. Asset Accounts (Checking, Savings, Cash, Investment):
 *    - Balance represents available capital.
 *    - Income / Inflow  => Increases balance (+amount)
 *    - Expense / Outflow => Decreases balance (-amount)
 *
 * 2. Liability Accounts (Credit Card):
 *    - Balance represents outstanding debt / liability owed (positive number).
 *    - Expense (Purchase)  => Increases outstanding debt (+amount)
 *    - Income / Repayment / Refund => Decreases outstanding debt (-amount)
 */
export function calculateBalanceDelta(
  accountType: Account['type'],
  txType: Transaction['type'],
  amount: number,
  transferRole?: 'source' | 'destination'
): number {
  const rounded = roundCurrency(Math.abs(amount));

  if (isLiabilityAccount(accountType)) {
    // For a credit card liability:
    // A purchase (expense) increases the outstanding debt.
    // A payment or refund (income) reduces the outstanding debt.
    // A transfer OUT of credit card (cash advance) increases debt.
    // A transfer IN to credit card (bill payoff) reduces debt.
    if (txType === 'expense') return rounded;
    if (txType === 'income' || txType === 'payment') return -rounded;
    if (txType === 'transfer') {
      return transferRole === 'source' ? rounded : -rounded;
    }
    return -rounded;
  }

  // For asset accounts (Checking, Savings, Cash, Investment):
  // Income increases funds.
  // Expense decreases funds.
  // Transfer into this account (destination) increases funds (+rounded).
  // Transfer out of this account (source) decreases funds (-rounded).
  // Payment out of this account (repayment) decreases funds (-rounded).
  if (txType === 'income') return rounded;
  if (txType === 'expense' || txType === 'payment') return -rounded;
  if (txType === 'transfer') {
    return transferRole === 'destination' ? rounded : -rounded;
  }
  return -rounded;
}

/**
 * Computes the new balance of an account when a transaction is added.
 */
export function applyTransactionToAccount(
  account: Account,
  tx: { type: Transaction['type']; amount: number; transferRole?: 'source' | 'destination' }
): Account {
  const delta = calculateBalanceDelta(account.type, tx.type, tx.amount, tx.transferRole);
  return {
    ...account,
    balance: roundCurrency(account.balance + delta),
  };
}

/**
 * Computes the new balance of an account when an existing transaction is deleted (reversing its exact effect).
 */
export function revertTransactionFromAccount(
  account: Account,
  tx: { type: Transaction['type']; amount: number; transferRole?: 'source' | 'destination' }
): Account {
  const delta = calculateBalanceDelta(account.type, tx.type, tx.amount, tx.transferRole);
  return {
    ...account,
    balance: roundCurrency(account.balance - delta),
  };
}

/**
 * Calculates the balance adjustment required when a transaction is edited.
 * If the account remains the same:
 *   adjustment = new_delta - old_delta
 *   new_balance = balance + adjustment
 */
export function calculateTransactionEditAdjustment(
  accountType: Account['type'],
  oldTx: { type: Transaction['type']; amount: number; transferRole?: 'source' | 'destination' },
  newTx: { type: Transaction['type']; amount: number; transferRole?: 'source' | 'destination' }
): number {
  const oldDelta = calculateBalanceDelta(accountType, oldTx.type, oldTx.amount, oldTx.transferRole);
  const newDelta = calculateBalanceDelta(accountType, newTx.type, newTx.amount, newTx.transferRole);
  return roundCurrency(newDelta - oldDelta);
}

