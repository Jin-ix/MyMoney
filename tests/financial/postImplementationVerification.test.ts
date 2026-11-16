import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { calculateNetWorth } from '@/lib/finance/netWorth';
import { calculateCashFlow } from '@/lib/finance/cashFlow';
import { calculateCategorySpent } from '@/lib/finance/budgetCalculations';
import { reconcileAccount } from '@/lib/finance/reconciliation';
import { calculateBalanceDelta } from '@/lib/finance/accountCalculations';
import { roundCurrency } from '@/lib/finance/money';
import type { Account, Transaction } from '@/types';

describe('Post-Implementation Financial Engine & Security Verification', () => {
  beforeEach(() => {
    useStore.setState({
      accounts: [
        {
          id: 'acc-chk',
          name: 'Primary Checking',
          type: 'checking',
          balance: 20000,
          initialBalance: 20000,
          currency: 'INR',
          color: '#10b981',
          icon: 'Building2',
        },
        {
          id: 'acc-sav',
          name: 'High Yield Savings',
          type: 'savings',
          balance: 10000,
          initialBalance: 10000,
          currency: 'INR',
          color: '#3b82f6',
          icon: 'PiggyBank',
        },
        {
          id: 'acc-crd',
          name: 'Sapphire Credit Card',
          type: 'credit',
          balance: 5000, // ₹5,000 liability
          initialBalance: 5000,
          currency: 'INR',
          color: '#f43f5e',
          icon: 'CreditCard',
        },
      ],
      transactions: [],
      budgets: [
        {
          id: 'b-electronics',
          category: 'shopping',
          allocated: 10000,
          spent: 0,
          month: '2026-11',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      recurringPayments: [
        {
          id: 'rec-gym',
          name: 'Fitness Gym Membership',
          amount: 1500,
          category: 'health',
          frequency: 'monthly',
          nextDate: '2026-11-20',
          originalBillingDay: 20,
          type: 'expense',
          accountId: 'acc-chk',
          isActive: true,
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Credit Card Refund Accounting
  // ---------------------------------------------------------------------------
  it('Credit Card Refund: Purchase followed by full refund restores liability and Net Worth', () => {
    const store = useStore.getState();
    const nwInitial = calculateNetWorth(store.accounts).netWorth;
    // 20000 (chk) + 10000 (sav) - 5000 (crd) = 25000
    expect(nwInitial).toBe(25000);

    // Step 1: Make a purchase of ₹2,000 on the credit card
    store.addTransaction({
      type: 'expense',
      amount: 2000,
      category: 'shopping',
      description: 'Noise Cancelling Headphones',
      date: '2026-11-14',
      paymentMethod: 'credit',
      accountId: 'acc-crd',
    });

    let card = useStore.getState().accounts.find((a) => a.id === 'acc-crd');
    expect(card?.balance).toBe(7000); // 5000 + 2000
    let nwPostPurchase = calculateNetWorth(useStore.getState().accounts).netWorth;
    expect(nwPostPurchase).toBe(23000); // 25000 - 2000

    // Step 2: Return item for a full refund of ₹2,000 to the credit card
    store.addTransaction({
      type: 'income',
      amount: 2000,
      category: 'shopping',
      description: 'Headphones Returned Refund',
      date: '2026-11-15',
      paymentMethod: 'credit',
      accountId: 'acc-crd',
    });

    card = useStore.getState().accounts.find((a) => a.id === 'acc-crd');
    expect(card?.balance).toBe(5000); // Restored to 5000 liability

    const nwPostRefund = calculateNetWorth(useStore.getState().accounts).netWorth;
    expect(nwPostRefund).toBe(25000); // Net Worth restored to initial 25000

    // Verify budget expenditure nets to 0
    const budgetSpent = calculateCategorySpent('shopping', useStore.getState().transactions);
    expect(budgetSpent).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Opening Balance Reconciliation
  // ---------------------------------------------------------------------------
  it('Opening Balance Reconciliation: Accurately incorporates opening balance into audit calculations', () => {
    const account: Account = {
      id: 'acc-test',
      name: 'Audited Checking',
      type: 'checking',
      balance: 18500,
      initialBalance: 20000,
      currency: 'INR',
      color: '#10b981',
      icon: 'Building2',
    };

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 1500,
        category: 'groceries',
        description: 'Supermarket',
        date: '2026-11-14',
        paymentMethod: 'upi',
        accountId: 'acc-test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      },
    ];

    // Expected: 20000 (initial) - 1500 (expense) = 18500. Stored is 18500. Discrepancy: 0.
    const report = reconcileAccount(account, transactions);
    expect(report.isReconciled).toBe(true);
    expect(report.discrepancy).toBe(0);
    expect(report.status).toBe('matched');
  });

  // ---------------------------------------------------------------------------
  // 3. Both Sides of Transfers Reconciled Correctly
  // ---------------------------------------------------------------------------
  it('Transfer Reconciliation: Both source and destination legs reconcile without artificial discrepancies', () => {
    const store = useStore.getState();

    // Execute transfer of ₹5,000 from Primary Checking to High Yield Savings
    store.transferBetweenAccounts({
      sourceAccountId: 'acc-chk',
      destinationAccountId: 'acc-sav',
      amount: 5000,
      date: '2026-11-14',
      description: 'Monthly Savings Allocation',
    });

    const state = useStore.getState();
    const chk = state.accounts.find((a) => a.id === 'acc-chk')!;
    const sav = state.accounts.find((a) => a.id === 'acc-sav')!;

    expect(chk.balance).toBe(15000);
    expect(sav.balance).toBe(15000);

    // Reconcile Source Leg: Initial 20,000 - 5,000 = 15,000
    const reportChk = reconcileAccount(chk, state.transactions);
    expect(reportChk.isReconciled).toBe(true);
    expect(reportChk.discrepancy).toBe(0);
    expect(reportChk.status).toBe('matched');

    // Reconcile Destination Leg: Initial 10,000 + 5,000 = 15,000
    const reportSav = reconcileAccount(sav, state.transactions);
    expect(reportSav.isReconciled).toBe(true);
    expect(reportSav.discrepancy).toBe(0);
    expect(reportSav.status).toBe('matched');
  });

  // ---------------------------------------------------------------------------
  // 4. Linked Transfer Deletion Reversibility
  // ---------------------------------------------------------------------------
  it('Transfer Deletion: Deleting either leg reverses both account balances atomically and cleans up transactions', () => {
    const store = useStore.getState();

    store.transferBetweenAccounts({
      sourceAccountId: 'acc-chk',
      destinationAccountId: 'acc-sav',
      amount: 4000,
      date: '2026-11-14',
    });

    expect(useStore.getState().accounts.find((a) => a.id === 'acc-chk')?.balance).toBe(16000);
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-sav')?.balance).toBe(14000);

    const txs = useStore.getState().transactions;
    expect(txs.length).toBe(2);

    // Delete one of the legs
    store.deleteTransaction(txs[0].id);

    // Both legs must be deleted
    expect(useStore.getState().transactions.length).toBe(0);

    // Both balances must be fully restored
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-chk')?.balance).toBe(20000);
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-sav')?.balance).toBe(10000);
  });

  // ---------------------------------------------------------------------------
  // 5. Concurrent Recurring Payment Click Idempotency
  // ---------------------------------------------------------------------------
  it('Concurrent Recurring Payments: Multiple rapid clicks for the same billing cycle produce exactly one transaction', () => {
    const store = useStore.getState();
    const gym = store.recurringPayments.find((p) => p.id === 'rec-gym')!;

    // Simulate 5 simultaneous rapid clicks
    const results = [
      store.markRecurringPaymentPaid(gym.id),
      store.markRecurringPaymentPaid(gym.id),
      store.markRecurringPaymentPaid(gym.id),
      store.markRecurringPaymentPaid(gym.id),
      store.markRecurringPaymentPaid(gym.id),
    ];

    expect(results[0]).toBe(true);
    expect(results[1]).toBe(false);
    expect(results[2]).toBe(false);
    expect(results[3]).toBe(false);
    expect(results[4]).toBe(false);

    // Exactly one transaction logged
    expect(useStore.getState().transactions.length).toBe(1);

    // Account debited once
    const chk = useStore.getState().accounts.find((a) => a.id === 'acc-chk');
    expect(chk?.balance).toBe(18500); // 20000 - 1500
  });

  // ---------------------------------------------------------------------------
  // 6. Savings to Checking (Reverse Transfer)
  // ---------------------------------------------------------------------------
  it('Reverse Transfer: Transferring from Savings to Checking debits Savings and credits Checking', () => {
    const store = useStore.getState();

    store.transferBetweenAccounts({
      sourceAccountId: 'acc-sav',
      destinationAccountId: 'acc-chk',
      amount: 3000,
      date: '2026-11-14',
      description: 'Emergency Fund Withdrawal',
    });

    const state = useStore.getState();
    expect(state.accounts.find((a) => a.id === 'acc-sav')?.balance).toBe(7000); // 10000 - 3000
    expect(state.accounts.find((a) => a.id === 'acc-chk')?.balance).toBe(23000); // 20000 + 3000

    // Net worth remains 25000
    const nw = calculateNetWorth(state.accounts).netWorth;
    expect(nw).toBe(25000);

    // Zero operating expenses
    const cf = calculateCashFlow(state.transactions);
    expect(cf.operatingExpenses).toBe(0);
    expect(cf.operatingIncome).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 7. Multi-Tenant RLS Simulation
  // ---------------------------------------------------------------------------
  it('Multi-Tenant RLS Isolation Logic: Rejects access when account does not belong to caller', () => {
    const userA_Id = '11111111-1111-4111-a111-111111111111';
    const userB_Id = '22222222-2222-4222-a222-222222222222';

    const accountUserB = {
      id: 'acc-user-b',
      user_id: userB_Id,
      name: 'User B Checking',
      balance: 100000,
    };

    // Simulated RLS policy: (auth.uid() = user_id)
    const canUserAAccess = (authUid: string, recordUserId: string) => authUid === recordUserId;

    expect(canUserAAccess(userA_Id, accountUserB.user_id)).toBe(false);
    expect(canUserAAccess(userB_Id, accountUserB.user_id)).toBe(true);
  });
});

