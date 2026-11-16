// Supabase-powered data service layer with offline-first localStorage fallback
import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Transaction,
  Budget,
  Account,
  SavingsGoal,
  RecurringPayment,
  UserSettings,
} from '@/types';

const STORAGE_KEYS = {
  transactions: 'mymoney_transactions',
  budgets: 'mymoney_budgets',
  accounts: 'mymoney_accounts',
  savingsGoals: 'mymoney_savings_goals',
  recurringPayments: 'mymoney_recurring_payments',
  settings: 'mymoney_settings',
  offlineQueue: 'mymoney_offline_queue',
};

export interface QueuedAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: string;
}

function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// -----------------------------------------------------------------------------
// Type Converters between Supabase snake_case and Frontend camelCase
// -----------------------------------------------------------------------------

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function ensureUuid(id?: string | null): string {
  if (id && isValidUuid(id)) return id;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureNullableUuid(id?: string | null): string | null {
  if (!id || !isValidUuid(id)) return null;
  return id;
}

function mapAccountFromDb(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance ?? 0),
    initialBalance: Number(row.initial_balance ?? row.balance ?? 0),
    currency: row.currency ?? 'INR',
    color: row.color ?? '#10b981',
    icon: row.icon ?? 'Wallet',
  };
}

function mapAccountToDb(account: Account, userId?: string | null) {
  return {
    id: ensureUuid(account.id),
    user_id: ensureNullableUuid(userId),
    name: account.name,
    type: account.type,
    balance: account.balance,
    initial_balance: account.initialBalance ?? account.balance,
    currency: account.currency,
    color: account.color,
    icon: account.icon,
  };
}

function mapTxFromDb(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount ?? 0),
    category: row.category,
    description: row.description ?? '',
    date: row.date,
    paymentMethod: row.payment_method ?? 'cash',
    accountId: row.account_id ?? '',
    destinationAccountId: row.destination_account_id ?? undefined,
    transferId: row.transfer_id ?? undefined,
    transferRole: row.transfer_role ?? undefined,
    isRepayment: row.is_repayment ?? undefined,
    recurringOccurrenceId: row.recurring_occurrence_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
  };
}

function mapTxToDb(tx: Transaction, userId?: string | null) {
  const base: Record<string, unknown> = {
    id: ensureUuid(tx.id),
    user_id: ensureNullableUuid(userId),
    account_id: ensureNullableUuid(tx.accountId),
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    description: tx.description,
    date: tx.date,
    payment_method: tx.paymentMethod,
    sync_status: 'synced',
  };

  if (tx.destinationAccountId && isValidUuid(tx.destinationAccountId)) {
    base.destination_account_id = tx.destinationAccountId;
  }
  if (tx.transferId && isValidUuid(tx.transferId)) {
    base.transfer_id = tx.transferId;
  }
  if (tx.transferRole) {
    base.transfer_role = tx.transferRole;
  }
  if (typeof tx.isRepayment === 'boolean') {
    base.is_repayment = tx.isRepayment;
  }
  if (tx.recurringOccurrenceId) {
    base.recurring_occurrence_id = tx.recurringOccurrenceId;
  }

  return base;
}

function mapBudgetFromDb(row: any): Budget {
  return {
    id: row.id,
    category: row.category,
    allocated: Number(row.allocated ?? 0),
    spent: Number(row.spent ?? 0),
    month: row.month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetToDb(budget: Budget, userId?: string | null) {
  return {
    id: ensureUuid(budget.id),
    user_id: ensureNullableUuid(userId),
    category: budget.category,
    allocated: budget.allocated,
    spent: budget.spent,
    month: budget.month,
  };
}

function mapGoalFromDb(row: any): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount ?? 0),
    currentAmount: Number(row.current_amount ?? 0),
    deadline: row.deadline ?? '',
    color: row.color ?? '#10b981',
    icon: row.icon ?? 'Target',
  };
}

function mapGoalToDb(goal: SavingsGoal, userId?: string | null) {
  return {
    id: ensureUuid(goal.id),
    user_id: ensureNullableUuid(userId),
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    deadline: goal.deadline || null,
    color: goal.color,
    icon: goal.icon,
  };
}

function mapRecurringFromDb(row: any): RecurringPayment {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount ?? 0),
    category: row.category,
    frequency: row.frequency,
    nextDate: row.next_date,
    type: row.type,
    accountId: row.account_id ?? '',
    isActive: row.is_active ?? true,
  };
}

function mapRecurringToDb(item: RecurringPayment, userId?: string | null) {
  return {
    id: ensureUuid(item.id),
    user_id: ensureNullableUuid(userId),
    account_id: ensureNullableUuid(item.accountId),
    name: item.name,
    amount: item.amount,
    category: item.category,
    frequency: item.frequency,
    next_date: item.nextDate,
    type: item.type,
    is_active: item.isActive,
  };
}

function mapSettingsFromDb(row: any): UserSettings {
  return {
    currency: row.currency ?? 'INR',
    currencySymbol: row.currency_symbol ?? '₹',
    dateFormat: row.date_format ?? 'dd/MM/yyyy',
    startOfWeek: row.start_of_week ?? 'monday',
    theme: row.theme ?? 'system',
    notifications: Boolean(row.notifications),
  };
}

function mapSettingsToDb(settings: UserSettings, userId?: string | null) {
  return {
    user_id: ensureNullableUuid(userId),
    currency: settings.currency,
    currency_symbol: settings.currencySymbol,
    date_format: settings.dateFormat,
    start_of_week: settings.startOfWeek,
    theme: settings.theme,
    notifications: settings.notifications,
  };
}

export const dataService = {
  // ---------------------------------------------------------------------------
  // LocalStorage Fast Cache
  // ---------------------------------------------------------------------------
  getLocalTransactions: (): Transaction[] => getFromStorage(STORAGE_KEYS.transactions, []),
  saveLocalTransactions: (txs: Transaction[]) => saveToStorage(STORAGE_KEYS.transactions, txs),

  getLocalBudgets: (): Budget[] => getFromStorage(STORAGE_KEYS.budgets, []),
  saveLocalBudgets: (b: Budget[]) => saveToStorage(STORAGE_KEYS.budgets, b),

  getLocalAccounts: (): Account[] => getFromStorage(STORAGE_KEYS.accounts, []),
  saveLocalAccounts: (a: Account[]) => saveToStorage(STORAGE_KEYS.accounts, a),

  getLocalSavingsGoals: (): SavingsGoal[] => getFromStorage(STORAGE_KEYS.savingsGoals, []),
  saveLocalSavingsGoals: (g: SavingsGoal[]) => saveToStorage(STORAGE_KEYS.savingsGoals, g),

  getLocalRecurringPayments: (): RecurringPayment[] => getFromStorage(STORAGE_KEYS.recurringPayments, []),
  saveLocalRecurringPayments: (r: RecurringPayment[]) => saveToStorage(STORAGE_KEYS.recurringPayments, r),

  getLocalSettings: (): UserSettings =>
    getFromStorage(STORAGE_KEYS.settings, {
      currency: 'INR',
      currencySymbol: '₹',
      dateFormat: 'dd/MM/yyyy',
      startOfWeek: 'monday' as const,
      theme: 'system' as const,
      notifications: true,
    }),
  saveLocalSettings: (s: UserSettings) => saveToStorage(STORAGE_KEYS.settings, s),

  clearAllLocalData: () => {
    localStorage.removeItem(STORAGE_KEYS.transactions);
    localStorage.removeItem(STORAGE_KEYS.budgets);
    localStorage.removeItem(STORAGE_KEYS.accounts);
    localStorage.removeItem(STORAGE_KEYS.savingsGoals);
    localStorage.removeItem(STORAGE_KEYS.recurringPayments);
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.offlineQueue);
  },

  // ---------------------------------------------------------------------------
  // Offline Queue
  // ---------------------------------------------------------------------------
  getOfflineQueue: (): QueuedAction[] => getFromStorage(STORAGE_KEYS.offlineQueue, []),
  addToOfflineQueue: (action: QueuedAction) => {
    const queue = getFromStorage<QueuedAction[]>(STORAGE_KEYS.offlineQueue, []);
    queue.push(action);
    saveToStorage(STORAGE_KEYS.offlineQueue, queue);
  },
  clearOfflineQueue: () => saveToStorage(STORAGE_KEYS.offlineQueue, []),
  removeFromOfflineQueue: (id: string) => {
    const queue = getFromStorage<QueuedAction[]>(STORAGE_KEYS.offlineQueue, []);
    saveToStorage(
      STORAGE_KEYS.offlineQueue,
      queue.filter((q) => q.id !== id)
    );
  },

  // ---------------------------------------------------------------------------
  // Supabase Backend Fetch & Mutations
  // ---------------------------------------------------------------------------
  async fetchAllRemote(userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return null;

    try {
      const [
        accountsRes,
        transactionsRes,
        budgetsRes,
        savingsRes,
        recurringRes,
        settingsRes,
      ] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('savings_goals').select('*'),
        supabase.from('recurring_payments').select('*'),
        supabase.from('user_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (accountsRes.error) console.warn('Supabase fetch accounts error:', accountsRes.error);
      if (transactionsRes.error) console.warn('Supabase fetch transactions error:', transactionsRes.error);
      if (budgetsRes.error) console.warn('Supabase fetch budgets error:', budgetsRes.error);
      if (savingsRes.error) console.warn('Supabase fetch savings error:', savingsRes.error);
      if (recurringRes.error) console.warn('Supabase fetch recurring error:', recurringRes.error);

      const accounts = (accountsRes.data ?? []).map(mapAccountFromDb);
      const transactions = (transactionsRes.data ?? []).map(mapTxFromDb);
      const budgets = (budgetsRes.data ?? []).map(mapBudgetFromDb);
      const savingsGoals = (savingsRes.data ?? []).map(mapGoalFromDb);
      const recurringPayments = (recurringRes.data ?? []).map(mapRecurringFromDb);
      const settings = settingsRes.data ? mapSettingsFromDb(settingsRes.data) : null;

      // Cache latest remote data in localStorage
      saveToStorage(STORAGE_KEYS.accounts, accounts);
      saveToStorage(STORAGE_KEYS.transactions, transactions);
      saveToStorage(STORAGE_KEYS.budgets, budgets);
      saveToStorage(STORAGE_KEYS.savingsGoals, savingsGoals);
      saveToStorage(STORAGE_KEYS.recurringPayments, recurringPayments);
      if (settings) saveToStorage(STORAGE_KEYS.settings, settings);

      return { accounts, transactions, budgets, savingsGoals, recurringPayments, settings };
    } catch (err) {
      console.error('Failed to fetch from Supabase:', err);
      return null;
    }
  },

  // Transactions
  async saveTransactionRemote(tx: Transaction, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapTxToDb(tx, userId);
    const { error } = await supabase.from('transactions').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveTransactionRemote error:', error);
      throw error;
    }
  },

  async deleteTransactionRemote(id: string) {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteTransactionRemote error:', error);
      throw error;
    }
  },

  // Atomic Transfers via RPC with graceful fallback
  async executeTransferRemote(params: {
    sourceAccountId: string;
    destAccountId: string;
    amount: number;
    date: string;
    description: string;
    transferId: string;
    sourceTxId: string;
    destTxId: string;
    sourceTx: Transaction;
    destTx: Transaction;
    sourceAccount: Account;
    destAccount: Account;
    userId?: string | null;
  }) {
    if (!supabase || !isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase.rpc('execute_transfer_atomic', {
        p_source_account_id: params.sourceAccountId,
        p_dest_account_id: params.destAccountId,
        p_amount: params.amount,
        p_date: params.date,
        p_description: params.description,
        p_transfer_id: params.transferId,
        p_source_tx_id: params.sourceTxId,
        p_dest_tx_id: params.destTxId,
      });

      if (!error && data?.success) {
        return data;
      }
    } catch {
      // Fallback if RPC not deployed
    }

    await Promise.all([
      this.saveTransactionRemote(params.sourceTx, params.userId),
      this.saveTransactionRemote(params.destTx, params.userId),
      this.saveAccountRemote(params.sourceAccount, params.userId),
      this.saveAccountRemote(params.destAccount, params.userId),
    ]);
  },

  async repayCreditCardRemote(params: {
    checkingAccountId: string;
    creditCardAccountId: string;
    amount: number;
    date: string;
    description: string;
    transferId: string;
    paymentTxId: string;
    creditTxId: string;
    paymentTx: Transaction;
    creditTx: Transaction;
    checkingAccount: Account;
    creditAccount: Account;
    userId?: string | null;
  }) {
    if (!supabase || !isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase.rpc('repay_credit_card_atomic', {
        p_checking_account_id: params.checkingAccountId,
        p_credit_card_account_id: params.creditCardAccountId,
        p_amount: params.amount,
        p_date: params.date,
        p_description: params.description,
        p_transfer_id: params.transferId,
        p_payment_tx_id: params.paymentTxId,
        p_credit_tx_id: params.creditTxId,
      });

      if (!error && data?.success) {
        return data;
      }
    } catch {
      // Fallback if RPC not deployed
    }

    await Promise.all([
      this.saveTransactionRemote(params.paymentTx, params.userId),
      this.saveTransactionRemote(params.creditTx, params.userId),
      this.saveAccountRemote(params.checkingAccount, params.userId),
      this.saveAccountRemote(params.creditAccount, params.userId),
    ]);
  },

  // Accounts
  async saveAccountRemote(account: Account, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapAccountToDb(account, userId);
    const { error } = await supabase.from('accounts').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveAccountRemote error:', error);
      throw error;
    }
  },

  async deleteAccountRemote(id: string) {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteAccountRemote error:', error);
      throw error;
    }
  },

  // Budgets
  async saveBudgetRemote(budget: Budget, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapBudgetToDb(budget, userId);
    const { error } = await supabase.from('budgets').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveBudgetRemote error:', error);
      throw error;
    }
  },

  async deleteBudgetRemote(id: string) {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteBudgetRemote error:', error);
      throw error;
    }
  },

  // Savings Goals
  async saveGoalRemote(goal: SavingsGoal, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapGoalToDb(goal, userId);
    const { error } = await supabase.from('savings_goals').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveGoalRemote error:', error);
      throw error;
    }
  },

  async deleteGoalRemote(id: string) {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteGoalRemote error:', error);
      throw error;
    }
  },

  // Recurring Payments
  async saveRecurringRemote(item: RecurringPayment, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapRecurringToDb(item, userId);
    const { error } = await supabase.from('recurring_payments').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveRecurringRemote error:', error);
      throw error;
    }
  },

  async deleteRecurringRemote(id: string) {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('recurring_payments').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteRecurringRemote error:', error);
      throw error;
    }
  },

  // Settings
  async saveSettingsRemote(settings: UserSettings, userId?: string | null) {
    if (!supabase || !isSupabaseConfigured) return;
    const dbPayload = mapSettingsToDb(settings, userId);
    const { error } = await supabase.from('user_settings').upsert(dbPayload);
    if (error) {
      console.error('Supabase saveSettingsRemote error:', error);
      throw error;
    }
  },
};
