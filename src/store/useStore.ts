import { create } from 'zustand';
import type {
  Transaction,
  Budget,
  Account,
  SavingsGoal,
  RecurringPayment,
  UserSettings,
} from '@/types';
import { dataService } from '@/lib/dataService';
import { supabase, type User } from '@/lib/supabase';
import { generateId, getCurrentMonth } from '@/lib/utils';
import { roundCurrency } from '@/lib/finance/money';
import {
  isLiabilityAccount,
  applyTransactionToAccount,
  revertTransactionFromAccount,
} from '@/lib/finance/accountCalculations';
import {
  getNextOccurrenceWithDayPreservation,
  generateCycleOccurrenceId,
} from '@/lib/finance/recurringCalculations';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  recurringPayments: RecurringPayment[];
  settings: UserSettings;

  user: User | null;
  authLoading: boolean;
  authModalOpen: boolean;

  currentMonth: string;
  isLoading: boolean;
  syncPending: number;
  syncState: SyncState;
  syncError: string | null;

  quickAddOpen: boolean;
  quickAddDefaultType: 'expense' | 'income';
  quickAddDate: string | null;
  editingTransaction: Transaction | null;
  toastMessage: string | null;
  hasSeenIntro: boolean;

  openQuickAdd: (type?: 'expense' | 'income', date?: string) => void;
  openEditTransaction: (tx: Transaction) => void;
  closeQuickAdd: () => void;
  showToast: (message: string) => void;
  completeIntro: () => void;
  replayIntro: () => void;
  setAuthModalOpen: (open: boolean) => void;

  setCurrentMonth: (month: string) => void;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  transferBetweenAccounts: (params: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    date?: string;
    description?: string;
  }) => void;
  repayCreditCard: (params: {
    checkingAccountId: string;
    creditCardAccountId: string;
    amount: number;
    date?: string;
    description?: string;
  }) => void;
  addSavingsGoalContribution: (params: {
    goalId: string;
    amount: number;
    sourceAccountId: string;
    date?: string;
  }) => void;
  withdrawSavingsGoalFunds: (params: {
    goalId: string;
    amount: number;
    destinationAccountId: string;
    date?: string;
  }) => void;
  markRecurringPaymentPaid: (id: string, date?: string) => boolean;

  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBudget: (id: string, data: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  addRecurringPayment: (payment: Omit<RecurringPayment, 'id'>) => void;
  updateRecurringPayment: (id: string, data: Partial<RecurringPayment>) => void;
  deleteRecurringPayment: (id: string) => void;

  updateSettings: (settings: Partial<UserSettings>) => void;
  syncOfflineQueue: () => Promise<void>;
  clearAllData: () => void;
  initialize: () => void;
}

function persistLocal(
  state: Pick<
    AppState,
    'transactions' | 'budgets' | 'accounts' | 'savingsGoals' | 'recurringPayments' | 'settings'
  >
) {
  dataService.saveLocalTransactions(state.transactions);
  dataService.saveLocalBudgets(state.budgets);
  dataService.saveLocalAccounts(state.accounts);
  dataService.saveLocalSavingsGoals(state.savingsGoals);
  dataService.saveLocalRecurringPayments(state.recurringPayments);
  dataService.saveLocalSettings(state.settings);
}

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  budgets: [],
  accounts: [],
  savingsGoals: [],
  recurringPayments: [],
  settings: {
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'dd/MM/yyyy',
    startOfWeek: 'monday',
    theme: 'light',
    notifications: true,
  },

  user: null,
  authLoading: true,
  authModalOpen: false,

  currentMonth: getCurrentMonth(),
  isLoading: true,
  syncPending: 0,
  syncState: navigator.onLine ? 'idle' : 'offline',
  syncError: null,

  quickAddOpen: false,
  quickAddDefaultType: 'expense',
  quickAddDate: null,
  editingTransaction: null,
  toastMessage: null,
  hasSeenIntro: sessionStorage.getItem('mymoney_intro_seen') === 'true',

  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  openQuickAdd: (type = 'expense', date) =>
    set({
      quickAddOpen: true,
      quickAddDefaultType: type,
      quickAddDate: date ?? null,
      editingTransaction: null,
    }),
  openEditTransaction: (tx) =>
    set({
      quickAddOpen: true,
      quickAddDefaultType: tx.type === 'income' ? 'income' : 'expense',
      quickAddDate: tx.date,
      editingTransaction: tx,
    }),
  closeQuickAdd: () =>
    set({ quickAddOpen: false, quickAddDate: null, editingTransaction: null }),
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set((s) => (s.toastMessage === message ? { toastMessage: null } : s));
    }, 2600);
  },
  completeIntro: () => {
    sessionStorage.setItem('mymoney_intro_seen', 'true');
    set({ hasSeenIntro: true });
  },
  replayIntro: () => {
    sessionStorage.removeItem('mymoney_intro_seen');
    set({ hasSeenIntro: false });
  },

  setCurrentMonth: (month) => set({ currentMonth: month }),

  // ---------------------------------------------------------------------------
  // Authentication Actions
  // ---------------------------------------------------------------------------
  signIn: async (email, password) => {
    if (!supabase) return { error: new Error('Supabase client not configured') };
    set({ authLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ user: data.user, authLoading: false, authModalOpen: false });
      if (data.user) {
        // Fetch remote data for user
        const remoteData = await dataService.fetchAllRemote(data.user.id);
        if (remoteData) {
          set({
            accounts: remoteData.accounts,
            transactions: remoteData.transactions,
            budgets: remoteData.budgets,
            savingsGoals: remoteData.savingsGoals,
            recurringPayments: remoteData.recurringPayments,
            settings: remoteData.settings ?? get().settings,
            syncState: 'synced',
          });
        }
      }
      get().showToast('Signed in successfully');
      return { error: null };
    } catch (err) {
      set({ authLoading: false });
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: new Error('Supabase client not configured') };
    set({ authLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      set({ user: data.user, authLoading: false });

      // If session exists or auto-confirmed, sign in right away
      if (data.session) {
        set({ authModalOpen: false });
        if (data.user) {
          const remoteData = await dataService.fetchAllRemote(data.user.id);
          if (remoteData) {
            set({
              accounts: remoteData.accounts,
              transactions: remoteData.transactions,
              budgets: remoteData.budgets,
              savingsGoals: remoteData.savingsGoals,
              recurringPayments: remoteData.recurringPayments,
              settings: remoteData.settings ?? get().settings,
              syncState: 'synced',
            });
          }
        }
      } else {
        // Automatically attempt sign in since auto_confirm trigger is active
        const signInRes = await supabase.auth.signInWithPassword({ email, password });
        if (signInRes.data.user) {
          set({ user: signInRes.data.user, authModalOpen: false });
          const remoteData = await dataService.fetchAllRemote(signInRes.data.user.id);
          if (remoteData) {
            set({
              accounts: remoteData.accounts,
              transactions: remoteData.transactions,
              budgets: remoteData.budgets,
              savingsGoals: remoteData.savingsGoals,
              recurringPayments: remoteData.recurringPayments,
              settings: remoteData.settings ?? get().settings,
              syncState: 'synced',
            });
          }
        }
      }
      get().showToast('Account created successfully');
      return { error: null };
    } catch (err) {
      set({ authLoading: false });
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    dataService.clearAllLocalData();
    set({
      user: null,
      transactions: [],
      budgets: [],
      accounts: [],
      savingsGoals: [],
      recurringPayments: [],
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        dateFormat: 'dd/MM/yyyy',
        startOfWeek: 'monday',
        theme: 'light',
        notifications: true,
      },
      syncState: 'idle',
      syncPending: 0,
    });
    get().showToast('Signed out');
  },

  // ---------------------------------------------------------------------------
  // Transactions & Financial Engine Actions
  // ---------------------------------------------------------------------------
  addTransaction: (tx) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const roundedAmount = roundCurrency(tx.amount);
    const newTx: Transaction = {
      ...tx,
      amount: roundedAmount,
      id: generateId(),
      createdAt: nowStr,
      updatedAt: nowStr,
      syncStatus: isOnline ? 'synced' : 'pending',
    };

    set((state) => {
      const transactions = [newTx, ...state.transactions];
      let updatedAccount: Account | null = null;
      const accounts = state.accounts.map((acc) => {
        if (acc.id !== tx.accountId) return acc;
        updatedAccount = applyTransactionToAccount(acc, newTx);
        return updatedAccount;
      });

      const syncPending = isOnline ? state.syncPending : state.syncPending + 1;
      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      if (isOnline) {
        dataService.saveTransactionRemote(newTx, state.user?.id || null).catch((err) => {
          console.error('Remote transaction save failed, queuing offline:', err);
          dataService.addToOfflineQueue({
            id: generateId(),
            action: 'create',
            table: 'transactions',
            data: newTx as unknown as Record<string, unknown>,
            timestamp: nowStr,
          });
        });
        if (updatedAccount) {
          dataService.saveAccountRemote(updatedAccount, state.user?.id || null).catch(console.error);
        }
      } else {
        dataService.addToOfflineQueue({
          id: generateId(),
          action: 'create',
          table: 'transactions',
          data: newTx as unknown as Record<string, unknown>,
          timestamp: nowStr,
        });
        if (updatedAccount) {
          dataService.addToOfflineQueue({
            id: generateId(),
            action: 'update',
            table: 'accounts',
            data: updatedAccount as unknown as Record<string, unknown>,
            timestamp: nowStr,
          });
        }
      }

      return {
        transactions,
        accounts,
        syncPending,
        syncState: isOnline ? 'synced' : 'offline',
      };
    });
  },

  updateTransaction: (id, data) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    set((state) => {
      const oldTx = state.transactions.find((t) => t.id === id);
      if (!oldTx) return state;

      const updatedTx: Transaction = {
        ...oldTx,
        ...data,
        amount: data.amount !== undefined ? roundCurrency(data.amount) : oldTx.amount,
        updatedAt: nowStr,
      };

      const transactions = state.transactions.map((t) => (t.id === id ? updatedTx : t));

      // Update account balance based on delta
      const touchedAccounts: Account[] = [];
      const accounts = state.accounts.map((acc) => {
        // Case A: Transaction stays on same account
        if (oldTx.accountId === updatedTx.accountId) {
          if (acc.id === updatedTx.accountId) {
            const reverted = revertTransactionFromAccount(acc, oldTx);
            const finalAcc = applyTransactionToAccount(reverted, updatedTx);
            touchedAccounts.push(finalAcc);
            return finalAcc;
          }
          return acc;
        }

        // Case B: Transaction moved from old account to a new account
        if (acc.id === oldTx.accountId) {
          const restored = revertTransactionFromAccount(acc, oldTx);
          touchedAccounts.push(restored);
          return restored;
        }
        if (acc.id === updatedTx.accountId) {
          const debited = applyTransactionToAccount(acc, updatedTx);
          touchedAccounts.push(debited);
          return debited;
        }
        return acc;
      });

      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      if (isOnline) {
        dataService.saveTransactionRemote(updatedTx, state.user?.id || null).catch(console.error);
        for (const acc of touchedAccounts) {
          dataService.saveAccountRemote(acc, state.user?.id || null).catch(console.error);
        }
      }

      return { transactions, accounts };
    });
  },

  deleteTransaction: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const targetTx = state.transactions.find((t) => t.id === id);
      if (!targetTx) return state;

      // Handle linked transfer deletion atomically
      const txsToDelete = targetTx.transferId
        ? state.transactions.filter((t) => t.transferId === targetTx.transferId)
        : [targetTx];

      const deleteIds = new Set(txsToDelete.map((t) => t.id));
      const transactions = state.transactions.filter((t) => !deleteIds.has(t.id));

      const touchedAccounts: Account[] = [];
      const accounts = state.accounts.map((acc) => {
        const matchingTxs = txsToDelete.filter((t) => t.accountId === acc.id);
        if (matchingTxs.length === 0) return acc;

        let restoredAcc = acc;
        for (const mTx of matchingTxs) {
          restoredAcc = revertTransactionFromAccount(restoredAcc, mTx);
        }
        touchedAccounts.push(restoredAcc);
        return restoredAcc;
      });

      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      if (isOnline) {
        for (const delTx of txsToDelete) {
          dataService.deleteTransactionRemote(delTx.id).catch(console.error);
        }
        for (const acc of touchedAccounts) {
          dataService.saveAccountRemote(acc, state.user?.id || null).catch(console.error);
        }
      }

      return { transactions, accounts };
    });
  },

  transferBetweenAccounts: (params) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const transferId = generateId();
    const amount = roundCurrency(params.amount);
    const date = params.date || new Date().toISOString().split('T')[0];

    set((state) => {
      const sourceAcc = state.accounts.find((a) => a.id === params.sourceAccountId);
      const destAcc = state.accounts.find((a) => a.id === params.destinationAccountId);
      if (!sourceAcc || !destAcc) return state;

      const sourceTx: Transaction = {
        id: generateId(),
        type: 'transfer',
        amount,
        category: 'transfer',
        description: params.description || `Transfer to ${destAcc.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.sourceAccountId,
        destinationAccountId: params.destinationAccountId,
        transferId,
        transferRole: 'source',
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const destTx: Transaction = {
        id: generateId(),
        type: 'transfer',
        amount,
        category: 'transfer',
        description: params.description || `Transfer from ${sourceAcc.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.destinationAccountId,
        destinationAccountId: params.sourceAccountId,
        transferId,
        transferRole: 'destination',
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      let updatedSource: Account;
      if (isLiabilityAccount(sourceAcc.type)) {
        updatedSource = { ...sourceAcc, balance: roundCurrency(sourceAcc.balance + amount) };
      } else {
        updatedSource = { ...sourceAcc, balance: roundCurrency(sourceAcc.balance - amount) };
      }

      let updatedDest: Account;
      if (isLiabilityAccount(destAcc.type)) {
        updatedDest = { ...destAcc, balance: roundCurrency(destAcc.balance - amount) };
      } else {
        updatedDest = { ...destAcc, balance: roundCurrency(destAcc.balance + amount) };
      }

      const transactions = [sourceTx, destTx, ...state.transactions];
      const accounts = state.accounts.map((acc) => {
        if (acc.id === updatedSource.id) return updatedSource;
        if (acc.id === updatedDest.id) return updatedDest;
        return acc;
      });

      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      if (isOnline) {
        dataService
          .executeTransferRemote({
            sourceAccountId: params.sourceAccountId,
            destAccountId: params.destinationAccountId,
            amount,
            date,
            description: params.description || `Transfer to ${destAcc.name}`,
            transferId,
            sourceTxId: sourceTx.id,
            destTxId: destTx.id,
            sourceTx,
            destTx,
            sourceAccount: updatedSource,
            destAccount: updatedDest,
            userId: state.user?.id || null,
          })
          .catch(console.error);
      }

      return { transactions, accounts };
    });
  },

  repayCreditCard: (params) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const transferId = generateId();
    const amount = roundCurrency(params.amount);
    const date = params.date || new Date().toISOString().split('T')[0];

    set((state) => {
      const checkingAcc = state.accounts.find((a) => a.id === params.checkingAccountId);
      const creditAcc = state.accounts.find((a) => a.id === params.creditCardAccountId);
      if (!checkingAcc || !creditAcc) return state;

      const paymentTx: Transaction = {
        id: generateId(),
        type: 'payment',
        amount,
        category: 'cc_payment',
        description: params.description || `Payment to ${creditAcc.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.checkingAccountId,
        destinationAccountId: params.creditCardAccountId,
        transferId,
        transferRole: 'source',
        isRepayment: true,
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const creditLegTx: Transaction = {
        id: generateId(),
        type: 'payment',
        amount,
        category: 'cc_payment',
        description: params.description || `Payment from ${checkingAcc.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.creditCardAccountId,
        destinationAccountId: params.checkingAccountId,
        transferId,
        transferRole: 'destination',
        isRepayment: true,
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const updatedChecking: Account = {
        ...checkingAcc,
        balance: roundCurrency(checkingAcc.balance - amount),
      };

      const updatedCredit: Account = {
        ...creditAcc,
        balance: roundCurrency(creditAcc.balance - amount),
      };

      const transactions = [paymentTx, creditLegTx, ...state.transactions];
      const accounts = state.accounts.map((acc) => {
        if (acc.id === updatedChecking.id) return updatedChecking;
        if (acc.id === updatedCredit.id) return updatedCredit;
        return acc;
      });

      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      if (isOnline) {
        dataService
          .repayCreditCardRemote({
            checkingAccountId: params.checkingAccountId,
            creditCardAccountId: params.creditCardAccountId,
            amount,
            date,
            description: params.description || `Payment to ${creditAcc.name}`,
            transferId,
            paymentTxId: paymentTx.id,
            creditTxId: creditLegTx.id,
            paymentTx,
            creditTx: creditLegTx,
            checkingAccount: updatedChecking,
            creditAccount: updatedCredit,
            userId: state.user?.id || null,
          })
          .catch(console.error);
      }

      return { transactions, accounts };
    });
  },

  addSavingsGoalContribution: (params) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const amount = roundCurrency(params.amount);
    const date = params.date || new Date().toISOString().split('T')[0];

    set((state) => {
      const goal = state.savingsGoals.find((g) => g.id === params.goalId);
      const sourceAcc = state.accounts.find((a) => a.id === params.sourceAccountId);
      if (!goal || !sourceAcc) return state;

      const updatedGoal: SavingsGoal = {
        ...goal,
        currentAmount: roundCurrency(goal.currentAmount + amount),
      };

      const contributionTx: Transaction = {
        id: generateId(),
        type: 'transfer',
        amount,
        category: 'savings',
        description: `Deposit to savings goal: ${goal.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.sourceAccountId,
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const updatedAcc = applyTransactionToAccount(sourceAcc, { type: 'expense', amount });

      const savingsGoals = state.savingsGoals.map((g) => (g.id === goal.id ? updatedGoal : g));
      const accounts = state.accounts.map((a) => (a.id === sourceAcc.id ? updatedAcc : a));
      const transactions = [contributionTx, ...state.transactions];

      const newState = { ...state, savingsGoals, accounts, transactions };
      persistLocal(newState);

      if (isOnline) {
        dataService.saveGoalRemote(updatedGoal, state.user?.id || null).catch(console.error);
        dataService.saveAccountRemote(updatedAcc, state.user?.id || null).catch(console.error);
        dataService.saveTransactionRemote(contributionTx, state.user?.id || null).catch(console.error);
      }

      return { savingsGoals, accounts, transactions };
    });
  },

  withdrawSavingsGoalFunds: (params) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const amount = roundCurrency(params.amount);
    const date = params.date || new Date().toISOString().split('T')[0];

    set((state) => {
      const goal = state.savingsGoals.find((g) => g.id === params.goalId);
      const destAcc = state.accounts.find((a) => a.id === params.destinationAccountId);
      if (!goal || !destAcc) return state;

      const actualWithdraw = Math.min(goal.currentAmount, amount);
      const updatedGoal: SavingsGoal = {
        ...goal,
        currentAmount: roundCurrency(Math.max(0, goal.currentAmount - actualWithdraw)),
      };

      const withdrawalTx: Transaction = {
        id: generateId(),
        type: 'transfer',
        amount: actualWithdraw,
        category: 'savings',
        description: `Withdrawal from savings goal: ${goal.name}`,
        date,
        paymentMethod: 'bank_transfer',
        accountId: params.destinationAccountId,
        createdAt: nowStr,
        updatedAt: nowStr,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const updatedAcc = applyTransactionToAccount(destAcc, { type: 'income', amount: actualWithdraw });

      const savingsGoals = state.savingsGoals.map((g) => (g.id === goal.id ? updatedGoal : g));
      const accounts = state.accounts.map((a) => (a.id === destAcc.id ? updatedAcc : a));
      const transactions = [withdrawalTx, ...state.transactions];

      const newState = { ...state, savingsGoals, accounts, transactions };
      persistLocal(newState);

      if (isOnline) {
        dataService.saveGoalRemote(updatedGoal, state.user?.id || null).catch(console.error);
        dataService.saveAccountRemote(updatedAcc, state.user?.id || null).catch(console.error);
        dataService.saveTransactionRemote(withdrawalTx, state.user?.id || null).catch(console.error);
      }

      return { savingsGoals, accounts, transactions };
    });
  },

  markRecurringPaymentPaid: (id, date) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const state = get();
    const p = state.recurringPayments.find((item) => item.id === id);
    if (!p) return false;

    // Idempotency: if no explicit date passed and payment was already logged, reject duplicate click
    if (!date && p.lastLoggedCycleDate) {
      return false;
    }

    const targetDate = date || p.nextDueDate || p.nextDate;
    const occurrenceId = generateCycleOccurrenceId(p.id, targetDate);

    // Idempotency check: prevent double logging for the same cycle
    if (
      p.lastLoggedCycleDate === targetDate ||
      state.transactions.some((t) => t.recurringOccurrenceId === occurrenceId)
    ) {
      return false;
    }

    const targetDay = p.originalBillingDay || parseInt(targetDate.split('-')[2], 10) || 1;
    const nextDueDate = getNextOccurrenceWithDayPreservation(targetDate, p.frequency, targetDay);

    const tx: Transaction = {
      id: generateId(),
      type: p.type,
      amount: roundCurrency(p.amount),
      category: p.category,
      description: p.name,
      date: targetDate,
      paymentMethod: 'upi',
      accountId: p.accountId,
      recurringOccurrenceId: occurrenceId,
      createdAt: nowStr,
      updatedAt: nowStr,
      syncStatus: isOnline ? 'synced' : 'pending',
    };

    const updatedPayment: RecurringPayment = {
      ...p,
      nextDate: nextDueDate,
      nextDueDate: nextDueDate,
      originalBillingDay: targetDay,
      lastLoggedCycleDate: targetDate,
    };

    let updatedAccount: Account | null = null;
    const accounts = state.accounts.map((acc) => {
      if (acc.id !== p.accountId) return acc;
      updatedAccount = applyTransactionToAccount(acc, tx);
      return updatedAccount;
    });

    const transactions = [tx, ...state.transactions];
    const recurringPayments = state.recurringPayments.map((item) =>
      item.id === id ? updatedPayment : item
    );

    const newState = { ...state, transactions, accounts, recurringPayments };
    persistLocal(newState);

    if (isOnline) {
      dataService.saveTransactionRemote(tx, state.user?.id || null).catch(console.error);
      dataService.saveRecurringRemote(updatedPayment, state.user?.id || null).catch(console.error);
      if (updatedAccount) {
        dataService.saveAccountRemote(updatedAccount, state.user?.id || null).catch(console.error);
      }
    }

    set({ transactions, accounts, recurringPayments });
    return true;
  },

  // ---------------------------------------------------------------------------
  // Budgets
  // ---------------------------------------------------------------------------
  addBudget: (budget) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const newBudget: Budget = {
      ...budget,
      id: generateId(),
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    set((state) => {
      const budgets = [...state.budgets, newBudget];
      persistLocal({ ...state, budgets });

      if (isOnline) {
        dataService.saveBudgetRemote(newBudget, state.user?.id || null).catch(console.error);
      }

      return { budgets };
    });
  },

  updateBudget: (id, data) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    set((state) => {
      let updatedBudget: Budget | null = null;
      const budgets = state.budgets.map((b) => {
        if (b.id === id) {
          updatedBudget = { ...b, ...data, updatedAt: nowStr };
          return updatedBudget;
        }
        return b;
      });
      persistLocal({ ...state, budgets });

      if (updatedBudget && isOnline) {
        dataService.saveBudgetRemote(updatedBudget, state.user?.id || null).catch(console.error);
      }

      return { budgets };
    });
  },

  deleteBudget: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const budgets = state.budgets.filter((b) => b.id !== id);
      persistLocal({ ...state, budgets });

      if (isOnline) {
        dataService.deleteBudgetRemote(id).catch(console.error);
      }

      return { budgets };
    });
  },

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------
  addAccount: (account) => {
    const isOnline = navigator.onLine;
    const initialBalance = account.initialBalance ?? roundCurrency(account.balance);
    const newAccount: Account = { ...account, id: generateId(), initialBalance };
    set((state) => {
      const accounts = [...state.accounts, newAccount];
      persistLocal({ ...state, accounts });

      if (isOnline) {
        dataService.saveAccountRemote(newAccount, state.user?.id || null).catch(console.error);
      }

      return { accounts };
    });
  },

  updateAccount: (id, data) => {
    const isOnline = navigator.onLine;
    set((state) => {
      let updatedAcc: Account | null = null;
      const accounts = state.accounts.map((a) => {
        if (a.id === id) {
          updatedAcc = { ...a, ...data };
          return updatedAcc;
        }
        return a;
      });
      persistLocal({ ...state, accounts });

      if (updatedAcc && isOnline) {
        dataService.saveAccountRemote(updatedAcc, state.user?.id || null).catch(console.error);
      }

      return { accounts };
    });
  },

  deleteAccount: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const accounts = state.accounts.filter((a) => a.id !== id);
      persistLocal({ ...state, accounts });

      if (isOnline) {
        dataService.deleteAccountRemote(id).catch(console.error);
      }

      return { accounts };
    });
  },

  // ---------------------------------------------------------------------------
  // Savings Goals
  // ---------------------------------------------------------------------------
  addSavingsGoal: (goal) => {
    const isOnline = navigator.onLine;
    const newGoal: SavingsGoal = { ...goal, id: generateId() };
    set((state) => {
      const savingsGoals = [...state.savingsGoals, newGoal];
      persistLocal({ ...state, savingsGoals });

      if (isOnline) {
        dataService.saveGoalRemote(newGoal, state.user?.id || null).catch(console.error);
      }

      return { savingsGoals };
    });
  },

  updateSavingsGoal: (id, data) => {
    const isOnline = navigator.onLine;
    set((state) => {
      let updatedGoal: SavingsGoal | null = null;
      const savingsGoals = state.savingsGoals.map((g) => {
        if (g.id === id) {
          updatedGoal = { ...g, ...data };
          return updatedGoal;
        }
        return g;
      });
      persistLocal({ ...state, savingsGoals });

      if (updatedGoal && isOnline) {
        dataService.saveGoalRemote(updatedGoal, state.user?.id || null).catch(console.error);
      }

      return { savingsGoals };
    });
  },

  deleteSavingsGoal: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
      persistLocal({ ...state, savingsGoals });

      if (isOnline) {
        dataService.deleteGoalRemote(id).catch(console.error);
      }

      return { savingsGoals };
    });
  },

  // ---------------------------------------------------------------------------
  // Recurring Payments
  // ---------------------------------------------------------------------------
  addRecurringPayment: (payment) => {
    const isOnline = navigator.onLine;
    const newPayment: RecurringPayment = { ...payment, id: generateId() };
    set((state) => {
      const recurringPayments = [...state.recurringPayments, newPayment];
      persistLocal({ ...state, recurringPayments });

      if (isOnline) {
        dataService.saveRecurringRemote(newPayment, state.user?.id || null).catch(console.error);
      }

      return { recurringPayments };
    });
  },

  updateRecurringPayment: (id, data) => {
    const isOnline = navigator.onLine;
    set((state) => {
      let updatedP: RecurringPayment | null = null;
      const recurringPayments = state.recurringPayments.map((p) => {
        if (p.id === id) {
          updatedP = { ...p, ...data };
          return updatedP;
        }
        return p;
      });
      persistLocal({ ...state, recurringPayments });

      if (updatedP && isOnline) {
        dataService.saveRecurringRemote(updatedP, state.user?.id || null).catch(console.error);
      }

      return { recurringPayments };
    });
  },

  deleteRecurringPayment: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const recurringPayments = state.recurringPayments.filter((p) => p.id !== id);
      persistLocal({ ...state, recurringPayments });

      if (isOnline) {
        dataService.deleteRecurringRemote(id).catch(console.error);
      }

      return { recurringPayments };
    });
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  updateSettings: (newSettings) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const settings = { ...state.settings, ...newSettings };
      persistLocal({ ...state, settings });

      if (isOnline) {
        dataService.saveSettingsRemote(settings, state.user?.id || null).catch(console.error);
      }

      return { settings };
    });
  },

  // ---------------------------------------------------------------------------
  // Offline Sync
  // ---------------------------------------------------------------------------
  syncOfflineQueue: async () => {
    if (!navigator.onLine) {
      set({ syncState: 'offline' });
      return;
    }

    const queue = dataService.getOfflineQueue();
    if (queue.length === 0) {
      set({ syncState: 'synced', syncPending: 0, syncError: null });
      return;
    }

    set({ syncState: 'syncing', syncError: null });
    const user = get().user;

    try {
      for (const item of queue) {
        if (item.table === 'transactions' && item.action === 'create') {
          await dataService.saveTransactionRemote(item.data as any, user?.id || null);
        }
      }
      dataService.clearOfflineQueue();
      set((state) => {
        const transactions = state.transactions.map((t) =>
          t.syncStatus === 'pending' ? { ...t, syncStatus: 'synced' as const } : t
        );
        persistLocal({ ...state, transactions });
        return { transactions, syncPending: 0, syncState: 'synced', syncError: null };
      });
      get().showToast('Offline changes synchronized');
    } catch (err) {
      set({
        syncState: 'error',
        syncError: err instanceof Error ? err.message : 'Failed to synchronize offline changes',
      });
    }
  },

  clearAllData: () => {
    const defaultSettings: UserSettings = {
      currency: 'INR',
      currencySymbol: '₹',
      dateFormat: 'dd/MM/yyyy',
      startOfWeek: 'monday',
      theme: 'light',
      notifications: true,
    };
    const emptyState = {
      transactions: [],
      budgets: [],
      accounts: [],
      savingsGoals: [],
      recurringPayments: [],
      settings: defaultSettings,
    };
    persistLocal(emptyState);
    dataService.clearOfflineQueue();
    dataService.clearAllLocalData();
    set({ ...emptyState, syncPending: 0, syncState: navigator.onLine ? 'idle' : 'offline' });
    get().showToast('Local data cleared');
  },

  // ---------------------------------------------------------------------------
  // Initialize App with Supabase Realtime & Auth Listeners
  // ---------------------------------------------------------------------------
  initialize: async () => {
    // 0. Ensure all legacy mock/dummy data is removed from client localStorage
    const CLEANUP_KEY = 'mymoney_clean_slate_v2';
    if (!localStorage.getItem(CLEANUP_KEY)) {
      dataService.clearAllLocalData();
      localStorage.setItem(CLEANUP_KEY, 'true');
    }

    // 1. Instant local load
    const transactions = dataService.getLocalTransactions();
    const budgets = dataService.getLocalBudgets();
    const accounts = dataService.getLocalAccounts();
    const savingsGoals = dataService.getLocalSavingsGoals();
    const recurringPayments = dataService.getLocalRecurringPayments();
    const settings = dataService.getLocalSettings();
    const offlineQueue = dataService.getOfflineQueue();

    set({
      transactions,
      budgets,
      accounts,
      savingsGoals,
      recurringPayments,
      settings,
      isLoading: false,
      syncPending: offlineQueue.length,
      syncState: navigator.onLine ? (offlineQueue.length > 0 ? 'idle' : 'synced') : 'offline',
    });

    if (!supabase) {
      set({ authLoading: false });
      return;
    }

    try {
      // 2. Fetch session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      set({ user: currentUser, authLoading: false });

      // Always load latest remote data from Supabase
      const remoteData = await dataService.fetchAllRemote(currentUser?.id || null);
      if (remoteData) {
        set({
          accounts: remoteData.accounts,
          transactions: remoteData.transactions,
          budgets: remoteData.budgets,
          savingsGoals: remoteData.savingsGoals,
          recurringPayments: remoteData.recurringPayments,
          settings: remoteData.settings ?? settings,
          syncState: 'synced',
        });
      }

      // 3. Listen to auth state changes
      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        const u = currentSession?.user ?? null;
        set({ user: u });

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const remote = await dataService.fetchAllRemote(u?.id || null);
          if (remote) {
            set({
              accounts: remote.accounts,
              transactions: remote.transactions,
              budgets: remote.budgets,
              savingsGoals: remote.savingsGoals,
              recurringPayments: remote.recurringPayments,
              settings: remote.settings ?? get().settings,
              syncState: 'synced',
            });
          }
        }
      });

      // 4. Supabase Realtime Channel
      supabase
        .channel('public:mymoney-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          async () => {
            const remote = await dataService.fetchAllRemote(get().user?.id || null);
            if (remote) set({ transactions: remote.transactions, accounts: remote.accounts });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts' },
          async () => {
            const remote = await dataService.fetchAllRemote(get().user?.id || null);
            if (remote) set({ accounts: remote.accounts });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'budgets' },
          async () => {
            const remote = await dataService.fetchAllRemote(get().user?.id || null);
            if (remote) set({ budgets: remote.budgets });
          }
        )
        .subscribe();

    } catch (err) {
      console.error('Failed to initialize Supabase connection:', err);
      set({ authLoading: false, syncState: 'error', syncError: 'Supabase connection error' });
    }
  },
}));
