import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { calculateNetWorth } from '@/lib/finance/netWorth';
import { calculateCashFlow } from '@/lib/finance/cashFlow';
import { calculateCategorySpent } from '@/lib/finance/budgetCalculations';
import { reconcileAccount } from '@/lib/finance/reconciliation';
import { getNextOccurrenceWithDayPreservation } from '@/lib/finance/recurringCalculations';
import { toMinorUnits, fromMinorUnits, roundCurrency, addMoney, subtractMoney } from '@/lib/finance/money';

describe('Financial Engine and Accounting Integrity Test Suite', () => {
  beforeEach(() => {
    useStore.setState({
      accounts: [
        {
          id: 'acc-checking',
          name: 'Checking Account',
          type: 'checking',
          balance: 10000,
          currency: 'INR',
          color: '#10b981',
          icon: 'Building2',
        },
        {
          id: 'acc-savings',
          name: 'Savings Account',
          type: 'savings',
          balance: 5000,
          currency: 'INR',
          color: '#3b82f6',
          icon: 'PiggyBank',
        },
        {
          id: 'acc-credit',
          name: 'Credit Card',
          type: 'credit',
          balance: 5000, // ₹5,000 outstanding liability
          currency: 'INR',
          color: '#f43f5e',
          icon: 'CreditCard',
        },
      ],
      transactions: [],
      budgets: [
        {
          id: 'b-food',
          category: 'food',
          allocated: 5000,
          spent: 0,
          month: '2026-11',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      savingsGoals: [
        {
          id: 'goal-emergency',
          name: 'Emergency Cushion',
          targetAmount: 50000,
          currentAmount: 10000,
          deadline: '2027-11-14',
          color: '#10b981',
          icon: 'Target',
        },
      ],
      recurringPayments: [
        {
          id: 'rec-netflix',
          name: 'Netflix Subscription',
          amount: 649,
          category: 'subscriptions',
          frequency: 'monthly',
          nextDate: '2026-01-31',
          originalBillingDay: 31,
          type: 'expense',
          accountId: 'acc-checking',
          isActive: true,
        },
      ],
    });
  });

  // SCENARIO A: Expense Creation
  it('Scenario A: Expense creation correctly decreases checking account balance by exact amount', () => {
    const store = useStore.getState();
    store.addTransaction({
      type: 'expense',
      amount: 500,
      category: 'food',
      description: 'Dinner',
      date: '2026-11-14',
      paymentMethod: 'upi',
      accountId: 'acc-checking',
    });

    const checking = useStore.getState().accounts.find((a) => a.id === 'acc-checking');
    expect(checking?.balance).toBe(9500);
  });

  // SCENARIO B: Expense Edit
  it('Scenario B: Editing an expense amount from ₹500 to ₹700 only debits the ₹200 differential', () => {
    const store = useStore.getState();
    store.addTransaction({
      type: 'expense',
      amount: 500,
      category: 'food',
      description: 'Dinner',
      date: '2026-11-14',
      paymentMethod: 'upi',
      accountId: 'acc-checking',
    });

    const tx = useStore.getState().transactions[0];
    expect(tx).toBeDefined();

    store.updateTransaction(tx.id, { amount: 700 });

    const checking = useStore.getState().accounts.find((a) => a.id === 'acc-checking');
    expect(checking?.balance).toBe(9300);
  });

  // SCENARIO C: Expense Deletion
  it('Scenario C: Deleting an expense completely restores account balance', () => {
    const store = useStore.getState();
    store.addTransaction({
      type: 'expense',
      amount: 700,
      category: 'food',
      description: 'Dinner',
      date: '2026-11-14',
      paymentMethod: 'upi',
      accountId: 'acc-checking',
    });

    const tx = useStore.getState().transactions[0];
    store.deleteTransaction(tx.id);

    const checking = useStore.getState().accounts.find((a) => a.id === 'acc-checking');
    expect(checking?.balance).toBe(10000);
    expect(useStore.getState().transactions.length).toBe(0);
  });

  // SCENARIO D: Income Creation
  it('Scenario D: Income creation increases target account balance', () => {
    const store = useStore.getState();
    store.addTransaction({
      type: 'income',
      amount: 10000,
      category: 'salary',
      description: 'Monthly Salary',
      date: '2026-11-14',
      paymentMethod: 'bank_transfer',
      accountId: 'acc-checking',
    });

    const checking = useStore.getState().accounts.find((a) => a.id === 'acc-checking');
    expect(checking?.balance).toBe(20000);
  });

  // SCENARIO E: Account Transfer
  it('Scenario E: Transfer of ₹5,000 between accounts leaves Total Assets and Net Worth unchanged', () => {
    useStore.setState({
      accounts: [
        { id: 'bank-a', name: 'Bank A', type: 'checking', balance: 20000, currency: 'INR', color: '#10b981', icon: 'Building2' },
        { id: 'bank-b', name: 'Bank B', type: 'savings', balance: 10000, currency: 'INR', color: '#3b82f6', icon: 'PiggyBank' },
      ],
      transactions: [],
    });

    const store = useStore.getState();
    const netWorthBefore = calculateNetWorth(store.accounts).netWorth;
    expect(netWorthBefore).toBe(30000);

    store.transferBetweenAccounts({
      sourceAccountId: 'bank-a',
      destinationAccountId: 'bank-b',
      amount: 5000,
      date: '2026-11-14',
      description: 'Reserve Fund Transfer',
    });

    const state = useStore.getState();
    const bankA = state.accounts.find((a) => a.id === 'bank-a');
    const bankB = state.accounts.find((a) => a.id === 'bank-b');

    expect(bankA?.balance).toBe(15000);
    expect(bankB?.balance).toBe(15000);

    const netWorthAfter = calculateNetWorth(state.accounts).netWorth;
    expect(netWorthAfter).toBe(30000);

    // Verify transfer is excluded from operating cashflow
    const cashFlow = calculateCashFlow(state.transactions);
    expect(cashFlow.operatingExpenses).toBe(0);
    expect(cashFlow.operatingIncome).toBe(0);
    expect(cashFlow.transferVolume).toBe(10000); // 2 legs of 5000
  });

  // SCENARIO F: Credit Card Purchase
  it('Scenario F: Credit card purchase increases liability and reduces Net Worth', () => {
    const store = useStore.getState();
    const netWorthBefore = calculateNetWorth(store.accounts).netWorth;
    // Total Assets = 10000 + 5000 = 15000. Liabilities = 5000. Net Worth = 10000.
    expect(netWorthBefore).toBe(10000);

    store.addTransaction({
      type: 'expense',
      amount: 1000,
      category: 'shopping',
      description: 'Electronics',
      date: '2026-11-14',
      paymentMethod: 'credit',
      accountId: 'acc-credit',
    });

    const card = useStore.getState().accounts.find((a) => a.id === 'acc-credit');
    // Outstanding liability should increase from 5000 to 6000
    expect(card?.balance).toBe(6000);

    const netWorthAfter = calculateNetWorth(useStore.getState().accounts).netWorth;
    // Net Worth should decrease by 1000 from 10000 to 9000
    expect(netWorthAfter).toBe(9000);
  });

  // SCENARIO G: Credit Card Repayment
  it('Scenario G: Credit card repayment reduces checking cash and credit card debt without duplicate operating expense', () => {
    useStore.setState({
      accounts: [
        { id: 'acc-checking', name: 'Checking', type: 'checking', balance: 50000, currency: 'INR', color: '#10b981', icon: 'Building2' },
        { id: 'acc-credit', name: 'Credit Card', type: 'credit', balance: 10000, currency: 'INR', color: '#f43f5e', icon: 'CreditCard' },
      ],
      transactions: [],
    });

    const store = useStore.getState();
    const netWorthBefore = calculateNetWorth(store.accounts).netWorth;
    // 50000 - 10000 = 40000
    expect(netWorthBefore).toBe(40000);

    store.repayCreditCard({
      checkingAccountId: 'acc-checking',
      creditCardAccountId: 'acc-credit',
      amount: 4000,
      date: '2026-11-14',
    });

    const state = useStore.getState();
    const checking = state.accounts.find((a) => a.id === 'acc-checking');
    const credit = state.accounts.find((a) => a.id === 'acc-credit');

    expect(checking?.balance).toBe(46000);
    expect(credit?.balance).toBe(6000);

    // Net worth remains unchanged: 46000 - 6000 = 40000
    const netWorthAfter = calculateNetWorth(state.accounts).netWorth;
    expect(netWorthAfter).toBe(40000);

    // Repayment must not generate operating expenses
    const cashFlow = calculateCashFlow(state.transactions);
    expect(cashFlow.operatingExpenses).toBe(0);
  });

  // SCENARIO H: Transaction Account Reassignment
  it('Scenario H: Moving an expense from Checking to Savings reverses old account and debits new account', () => {
    const store = useStore.getState();
    store.addTransaction({
      type: 'expense',
      amount: 1500,
      category: 'shopping',
      description: 'Shoes',
      date: '2026-11-14',
      paymentMethod: 'upi',
      accountId: 'acc-checking',
    });

    expect(useStore.getState().accounts.find((a) => a.id === 'acc-checking')?.balance).toBe(8500);
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-savings')?.balance).toBe(5000);

    const tx = useStore.getState().transactions[0];
    store.updateTransaction(tx.id, { accountId: 'acc-savings' });

    // Checking restored to 10000, Savings debited to 3500
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-checking')?.balance).toBe(10000);
    expect(useStore.getState().accounts.find((a) => a.id === 'acc-savings')?.balance).toBe(3500);
  });

  // SCENARIO I: Duplicate Recurring Payment Idempotency
  it('Scenario I: Clicking Mark Paid multiple times on recurring payment creates exactly one transaction', () => {
    const store = useStore.getState();
    const p = store.recurringPayments[0];

    const firstSuccess = store.markRecurringPaymentPaid(p.id);
    expect(firstSuccess).toBe(true);
    expect(useStore.getState().transactions.length).toBe(1);

    // Immediate second click for the same billing cycle must be rejected
    const secondSuccess = store.markRecurringPaymentPaid(p.id);
    expect(secondSuccess).toBe(false);
    expect(useStore.getState().transactions.length).toBe(1);
  });

  // SCENARIO J: Month-End Date Progression
  it('Scenario J: Preserves intended billing day across variable month lengths (Jan 31 -> Feb 28 -> Mar 31)', () => {
    const febDate = getNextOccurrenceWithDayPreservation('2026-01-31', 'monthly', 31);
    expect(febDate).toBe('2026-02-28');

    // From Feb 28, advancing by 1 month with target day 31 must reclaim March 31!
    const marDate = getNextOccurrenceWithDayPreservation('2026-02-28', 'monthly', 31);
    expect(marDate).toBe('2026-03-31');

    // Apr has 30 days
    const aprDate = getNextOccurrenceWithDayPreservation('2026-03-31', 'monthly', 31);
    expect(aprDate).toBe('2026-04-30');

    // May reclaims 31
    const mayDate = getNextOccurrenceWithDayPreservation('2026-04-30', 'monthly', 31);
    expect(mayDate).toBe('2026-05-31');
  });

  // SCENARIO K: Budget Refund Netting
  it('Scenario K: Category expense of ₹500 and category refund of ₹100 nets to ₹400 spent', () => {
    const txs: any[] = [
      { id: '1', type: 'expense', amount: 500, category: 'food' },
      { id: '2', type: 'income', amount: 100, category: 'food' },
    ];

    const netSpent = calculateCategorySpent('food', txs);
    expect(netSpent).toBe(400);
  });

  // SCENARIO L: Reconciliation Discrepancy Detection
  it('Scenario L: Reconciles stored balance against transaction ledger and flags discrepancy', () => {
    const account: any = {
      id: 'bank-audit',
      name: 'Audit Bank',
      type: 'checking',
      balance: 9500, // Stored balance
    };

    const txs: any[] = [
      { id: 't1', accountId: 'bank-audit', type: 'income', amount: 10000 },
      { id: 't2', accountId: 'bank-audit', type: 'expense', amount: 1000 },
      // Expected = 0 + 10000 - 1000 = 9000. Stored is 9500 (discrepancy of +500)
    ];

    const report = reconcileAccount(account, txs, 0);
    expect(report.isReconciled).toBe(false);
    expect(report.discrepancy).toBe(500);
    expect(report.status).toBe('discrepancy_detected');
    // Verify reconciliation does NOT alter stored balance
    expect(account.balance).toBe(9500);
  });

  // Monetary Arithmetic Precision
  it('Precision: Floating-point additions and subtractions round cleanly to minor units', () => {
    expect(addMoney(19.99, 0.01)).toBe(20);
    expect(subtractMoney(100.1, 0.05)).toBe(100.05);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(fromMinorUnits(1999)).toBe(19.99);
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});

