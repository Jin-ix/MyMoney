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
      quickAddDefaultType: tx.type,
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
  // Transactions
  // ---------------------------------------------------------------------------
  addTransaction: (tx) => {
    const nowStr = new Date().toISOString();
    const isOnline = navigator.onLine;
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      createdAt: nowStr,
      updatedAt: nowStr,
      syncStatus: isOnline ? 'synced' : 'pending',
    };

    set((state) => {
      const transactions = [newTx, ...state.transactions];
      const accounts = state.accounts.map((acc) => {
        if (acc.id !== tx.accountId) return acc;
        const delta = tx.type === 'income' ? tx.amount : -tx.amount;
        return { ...acc, balance: acc.balance + delta };
      });

      const syncPending = isOnline ? state.syncPending : state.syncPending + 1;
      const newState = { ...state, transactions, accounts };
      persistLocal(newState);

      // Save directly to Supabase
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
      } else {
        dataService.addToOfflineQueue({
          id: generateId(),
          action: 'create',
          table: 'transactions',
          data: newTx as unknown as Record<string, unknown>,
          timestamp: nowStr,
        });
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
      let updatedTx: Transaction | null = null;
      const transactions = state.transactions.map((t) => {
        if (t.id === id) {
          updatedTx = { ...t, ...data, updatedAt: nowStr };
          return updatedTx;
        }
        return t;
      });

      const newState = { ...state, transactions };
      persistLocal(newState);

      if (updatedTx && isOnline) {
        dataService.saveTransactionRemote(updatedTx, state.user?.id || null).catch(console.error);
      }

      return { transactions };
    });
  },

  deleteTransaction: (id) => {
    const isOnline = navigator.onLine;
    set((state) => {
      const transactions = state.transactions.filter((t) => t.id !== id);
      const newState = { ...state, transactions };
      persistLocal(newState);

      if (isOnline) {
        dataService.deleteTransactionRemote(id).catch(console.error);
      }

      return { transactions };
    });
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
    const newAccount: Account = { ...account, id: generateId() };
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
