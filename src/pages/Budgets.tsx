import { useState, useMemo } from 'react';
import {
  Plus,
  PieChart,
  AlertTriangle,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MonthSelector } from '@/components/ui/MonthSelector';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Select } from '@/components/ui/Select';
import { EXPENSE_CATEGORIES, getCategoryById } from '@/lib/categories';
import { formatCurrency, isInMonth, clampPercentage } from '@/lib/utils';
import { calculateCategorySpent } from '@/lib/finance/budgetCalculations';
import type { Budget } from '@/types';

export default function Budgets() {
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const currentMonth = useStore((s) => s.currentMonth);
  const setCurrentMonth = useStore((s) => s.setCurrentMonth);
  const addBudget = useStore((s) => s.addBudget);
  const updateBudget = useStore((s) => s.updateBudget);
  const deleteBudget = useStore((s) => s.deleteBudget);
  const symbol = useStore((s) => s.settings.currencySymbol);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [allocated, setAllocated] = useState('');
  const [error, setError] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Month-specific budgets with computed spent amount (netted for refunds and excluding transfers)
  const monthBudgets = useMemo(() => {
    const monthTxs = transactions.filter((t) => isInMonth(t.date, currentMonth));
    return budgets
      .filter((b) => b.month === currentMonth)
      .map((b) => {
        const spent = calculateCategorySpent(monthTxs, b.category);
        return { ...b, spent };
      });
  }, [budgets, transactions, currentMonth]);

  // Totals & KPI Metrics
  const totals = useMemo(() => {
    const totalAllocated = monthBudgets.reduce((s, b) => s + b.allocated, 0);
    const totalSpent = monthBudgets.reduce((s, b) => s + b.spent, 0);
    const remaining = totalAllocated - totalSpent;
    const pct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

    // Daily safe to spend calculation for remaining days in month
    const now = new Date();
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentCalendarMonth =
      now.getFullYear() === year && now.getMonth() + 1 === month;
    const currentDay = isCurrentCalendarMonth ? now.getDate() : 1;
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
    const dailySafeSpend = remaining > 0 ? remaining / daysRemaining : 0;

    return { totalAllocated, totalSpent, remaining, pct, dailySafeSpend, daysRemaining };
  }, [monthBudgets, currentMonth]);

  // Unbudgeted categories that had spending this month
  const unbudgetedSpending = useMemo(() => {
    const budgetedCats = new Set(monthBudgets.map((b) => b.category));
    const monthTxs = transactions.filter((t) => isInMonth(t.date, currentMonth));

    const map = new Map<string, number>();
    for (const t of monthTxs) {
      if (!budgetedCats.has(t.category)) {
        const netSpent = calculateCategorySpent(monthTxs, t.category);
        if (netSpent > 0) {
          map.set(t.category, netSpent);
        }
      }
    }
    return Array.from(map.entries()).map(([catId, amount]) => ({
      category: catId,
      amount,
    }));
  }, [monthBudgets, transactions, currentMonth]);

  const openAddSheet = (presetCategory?: string, presetAmount?: number) => {
    setEditingBudget(null);
    setCategory(presetCategory || EXPENSE_CATEGORIES[0].id);
    setAllocated(presetAmount ? String(presetAmount) : '');
    setError('');
    setIsSheetOpen(true);
  };

  const openEditSheet = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setAllocated(String(budget.allocated));
    setError('');
    setIsSheetOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(allocated);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a budget amount greater than 0');
      return;
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, { category, allocated: amount });
    } else {
      // Check if budget for this category already exists in current month
      const existing = budgets.find(
        (b) => b.month === currentMonth && b.category === category
      );
      if (existing) {
        updateBudget(existing.id, { allocated: amount });
      } else {
        addBudget({
          category,
          allocated: amount,
          spent: 0,
          month: currentMonth,
        });
      }
    }
    setIsSheetOpen(false);
  };

  const handleDelete = () => {
    if (!editingBudget) return;
    deleteBudget(editingBudget.id);
    setIsSheetOpen(false);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Budgets & Spending Limits
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Targeted allocations, spending pace tracking, and monthly containment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
          <button
            type="button"
            onClick={() => openAddSheet()}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <Plus size={17} />
            <span>New Budget</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Allocated</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular truncate">
            {formatCurrency(totals.totalAllocated, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Across {monthBudgets.length} categories
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Spent So Far</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular truncate">
            {formatCurrency(totals.totalSpent, symbol)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-xs font-bold ${
                totals.pct > 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : totals.pct >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {totals.pct}% utilized
            </span>
          </div>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Buffer</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck size={14} />
            </span>
          </div>
          <p
            className={`text-lg sm:text-2xl font-bold font-tabular truncate ${
              totals.remaining < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {formatCurrency(totals.remaining, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            {totals.remaining < 0 ? 'Exceeded overall allocation' : 'Available unspent budget'}
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Daily Safe Pace</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Zap size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular truncate">
            {formatCurrency(Math.max(0, Math.round(totals.dailySafeSpend)), symbol)}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">/day</span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Over {totals.daysRemaining} days remaining
          </span>
        </div>
      </div>

      {/* Main Budget Progress Card */}
      {monthBudgets.length > 0 && (
        <div className="fintech-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Monthly Envelope Burn
              </h2>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular mt-0.5">
                {formatCurrency(totals.totalSpent, symbol)}{' '}
                <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                  of {formatCurrency(totals.totalAllocated, symbol)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                  totals.pct > 100
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    : totals.pct >= 80
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {totals.pct > 100 && <AlertTriangle size={13} />}
                {totals.pct}% Used
              </span>
            </div>
          </div>

          {/* Large Progress Bar with Markers */}
          <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totals.pct > 100
                  ? 'bg-rose-500'
                  : totals.pct >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${clampPercentage(totals.pct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2 font-tabular">
            <span>0%</span>
            <span>50% Target</span>
            <span>80% Warning</span>
            <span>100% Limit</span>
          </div>
        </div>
      )}

      {/* Category Budget Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Category Allocations ({monthBudgets.length})
          </h2>
          {monthBudgets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Info size={13} />
              <span>{showRecommendations ? 'Hide Unbudgeted' : 'View Unbudgeted Categories'}</span>
            </button>
          )}
        </div>

        {/* Unbudgeted Categories Alert/Drawer */}
        {showRecommendations && unbudgetedSpending.length > 0 && (
          <div className="fintech-card p-4 mb-4 border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-2.5 mb-2.5">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Unbudgeted Spending Detected
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  You spent money in these categories this month without an assigned budget envelope. Click to allocate:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {unbudgetedSpending.map((item) => {
                const cat = getCategoryById(item.category);
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => openAddSheet(item.category, Math.ceil(item.amount * 1.2))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-800 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <span>{cat?.name || item.category}</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.amount, symbol)}
                    </span>
                    <Plus size={13} className="text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {monthBudgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthBudgets.map((b) => {
              const cat = getCategoryById(b.category);
              const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
              const remaining = b.allocated - b.spent;
              const isOver = remaining < 0;
              const isWarning = pct >= 80 && !isOver;

              return (
                <div
                  key={b.id}
                  onClick={() => openEditSheet(b)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openEditSheet(b);
                  }}
                  className={`fintech-card fintech-card-interactive p-4 sm:p-5 cursor-pointer relative overflow-hidden transition-all ${
                    isOver
                      ? '!border-rose-300 dark:!border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : isWarning
                      ? '!border-amber-300 dark:!border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                      >
                        <CategoryIcon name={cat?.icon ?? 'MoreHorizontal'} size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                          {cat?.name ?? b.category}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-tabular">
                          {formatCurrency(b.spent, symbol)} of {formatCurrency(b.allocated, symbol)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isOver
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            : isWarning
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isOver && <AlertTriangle size={12} />}
                        {pct}%
                      </span>
                      <ChevronRight size={16} className="text-gray-400 hidden sm:block" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${clampPercentage(pct)}%`,
                        backgroundColor: isOver ? '#f43f5e' : isWarning ? '#f59e0b' : cat?.color ?? '#10b981',
                      }}
                    />
                  </div>

                  {/* Footer numbers */}
                  <div className="flex items-center justify-between text-xs font-tabular">
                    <span className="text-gray-500 dark:text-slate-400">
                      Cap: {formatCurrency(b.allocated, symbol)}
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver
                          ? 'text-rose-600 dark:text-rose-400'
                          : isWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isOver
                        ? `Over by ${formatCurrency(Math.abs(remaining), symbol)}`
                        : `${formatCurrency(remaining, symbol)} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="fintech-card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <PieChart size={26} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No budgets allocated for this month
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Setting realistic category spending limits is the foundation of wealth preservation. Start with essentials like Groceries or Rent.
            </p>
            <button
              type="button"
              onClick={() => openAddSheet()}
              className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Create First Budget</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Budget Bottom Sheet Modal */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingBudget ? 'Edit Category Budget' : 'Create Category Budget'}
      >
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          <div>
            <label
              htmlFor="budget-cat"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Category
            </label>
            <Select
              id="budget-cat"
              value={category}
              onChange={setCategory}
              options={EXPENSE_CATEGORIES.map((cat) => ({
                value: cat.id,
                label: cat.name,
                color: cat.color,
              }))}
            />
          </div>

          <div>
            <label
              htmlFor="budget-amount"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Allocated Monthly Limit ({symbol})
            </label>
            <input
              id="budget-amount"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="e.g. 5000"
              value={allocated}
              onChange={(e) => {
                setAllocated(e.target.value.replace(/[^0-9.]/g, ''));
                if (error) setError('');
              }}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold text-gray-900 dark:text-white font-tabular outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[1000, 2500, 5000, 10000, 20000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAllocated(String(amt))}
                  className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-slate-300 hover:text-emerald-600 font-tabular transition-colors cursor-pointer"
                >
                  {formatCurrency(amt, symbol)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-3">
            {editingBudget && (
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[48px] px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold shadow-xs transition-all cursor-pointer"
            >
              {editingBudget ? 'Save Changes' : 'Confirm & Allocate'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
