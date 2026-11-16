// Type definitions for MyMoney application

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'payment';
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  accountId: string;
  destinationAccountId?: string;
  transferId?: string;
  transferRole?: 'source' | 'destination';
  isRepayment?: boolean;
  recurringOccurrenceId?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  month: string; // YYYY-MM format
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  initialBalance?: number;
  currency: string;
  color: string;
  icon: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
  icon: string;
  sourceAccountId?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
  nextDueDate?: string;
  type: 'income' | 'expense';
  accountId: string;
  isActive: boolean;
  originalBillingDay?: number;
  lastLoggedCycleDate?: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
}

export interface MonthlyReport {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    income: number;
    expenses: number;
  }>;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  startOfWeek: 'monday' | 'sunday';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export type ViewPeriod = 'weekly' | 'monthly' | 'yearly';

