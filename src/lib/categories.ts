import type { CategoryConfig } from '@/types';

export const EXPENSE_CATEGORIES: CategoryConfig[] = [
  { id: 'food', name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#f97316', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: 'Car', color: '#3b82f6', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'Receipt', color: '#8b5cf6', type: 'expense' },
  { id: 'health', name: 'Health', icon: 'Heart', color: '#ef4444', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', color: '#06b6d4', type: 'expense' },
  { id: 'education', name: 'Education', icon: 'GraduationCap', color: '#14b8a6', type: 'expense' },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#22c55e', type: 'expense' },
  { id: 'rent', name: 'Rent', icon: 'Home', color: '#a855f7', type: 'expense' },
  { id: 'insurance', name: 'Insurance', icon: 'Shield', color: '#64748b', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'CreditCard', color: '#f43f5e', type: 'expense' },
  { id: 'other_expense', name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense' },
];

export const INCOME_CATEGORIES: CategoryConfig[] = [
  { id: 'salary', name: 'Salary', icon: 'Briefcase', color: '#059669', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#3b82f6', type: 'income' },
  { id: 'investment', name: 'Investment', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' },
  { id: 'gift', name: 'Gift', icon: 'Gift', color: '#ec4899', type: 'income' },
  { id: 'refund', name: 'Refund', icon: 'RotateCcw', color: '#f97316', type: 'income' },
  { id: 'other_income', name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', type: 'income' },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: 'Banknote' },
  { id: 'debit', name: 'Debit Card', icon: 'CreditCard' },
  { id: 'credit', name: 'Credit Card', icon: 'CreditCard' },
  { id: 'upi', name: 'UPI', icon: 'Smartphone' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'Building2' },
  { id: 'wallet', name: 'Digital Wallet', icon: 'Wallet' },
];

export function getCategoryById(id: string): CategoryConfig | undefined {
  return ALL_CATEGORIES.find(c => c.id === id);
}

export function getCategoriesByType(type: 'income' | 'expense'): CategoryConfig[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

