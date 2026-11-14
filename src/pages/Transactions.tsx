import { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  ArrowUpDown,
  Plus,
  Pencil,
  Download,
  Filter,
  X,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '@/store/useStore';
import { MonthSelector } from '@/components/ui/MonthSelector';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ALL_CATEGORIES, getCategoryById, PAYMENT_METHODS } from '@/lib/categories';
import { formatCurrency, formatDate, isInMonth } from '@/lib/utils';
import type { Transaction } from '@/types';

type TypeFilter = 'all' | 'income' | 'expense';
type ScopeFilter = 'month' | 'all';
type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const currentMonth = useStore((s) => s.currentMonth);
  const setCurrentMonth = useStore((s) => s.setCurrentMonth);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const openQuickAdd = useStore((s) => s.openQuickAdd);
  const openEditTransaction = useStore((s) => s.openEditTransaction);
  const showToast = useStore((s) => s.showToast);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const dateFormat = useStore((s) => s.settings.dateFormat);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // Filter & sort logic
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions
      .filter((t) => (scope === 'month' ? isInMonth(t.date, currentMonth) : true))
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .filter((t) => (accountFilter === 'all' ? true : t.accountId === accountFilter))
      .filter((t) => {
        if (!query) return true;
        const catName = getCategoryById(t.category)?.name.toLowerCase() ?? '';
        return t.description.toLowerCase().includes(query) || catName.includes(query);
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
        if (sortBy === 'date_asc') return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, scope, currentMonth, typeFilter, categoryFilter, accountFilter, search, sortBy]);

  // Aggregate stats of filtered transactions
  const filteredSummary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        acc.net = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, net: 0 }
    );
  }, [filteredTransactions]);

  // Date-grouped structure
  const groupedByDate = useMemo(() => {
    const map = new Map<string, { items: Transaction[]; totalDayExpense: number; totalDayIncome: number }>();
    filteredTransactions.forEach((tx) => {
      const existing = map.get(tx.date) ?? { items: [], totalDayExpense: 0, totalDayIncome: 0 };
      existing.items.push(tx);
      if (tx.type === 'expense') existing.totalDayExpense += tx.amount;
      else existing.totalDayIncome += tx.amount;
      map.set(tx.date, existing);
    });

    const groups: Array<{ date: string; items: Transaction[]; totalDayExpense: number; totalDayIncome: number }> = [];
    map.forEach((val, date) => {
      groups.push({ date, ...val });
    });
    return groups;
  }, [filteredTransactions]);

  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    scope === 'all' ||
    categoryFilter !== 'all' ||
    accountFilter !== 'all';

  const clearAllFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setScope('month');
    setCategoryFilter('all');
    setAccountFilter('all');
    setSortBy('date_desc');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Category', 'Description', 'Payment Method', 'Account'];
    const rows = filteredTransactions.map((t) => {
      const acc = accounts.find((a) => a.id === t.accountId);
      const cat = getCategoryById(t.category)?.name ?? t.category;
      return [
        t.id,
        t.date,
        t.type,
        t.amount,
        `"${cat}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.paymentMethod,
        `"${acc?.name ?? ''}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MyMoney_Transactions_${scope === 'month' ? currentMonth : 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported transactions to CSV');
  };

  const handleConfirmDelete = () => {
    if (deletingTx) {
      deleteTransaction(deletingTx.id);
      showToast('✓ Transaction deleted');
      setDeletingTx(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Main Scope Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Transactions Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit, filter, and reconcile all income and expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle: Month vs All Time */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setScope('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                scope === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                scope === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {scope === 'month' && (
            <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            title="Export filtered transactions to CSV"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAdd('expense')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Ribbon */}
      <div className="fintech-card p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, remarks, or merchant..."
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs outline-none focus:border-emerald-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter Pills (All / Expense / Income) */}
          <div className="md:col-span-3 flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            {(['all', 'expense', 'income'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1.5 rounded-lg text-center capitalize transition-colors cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Dropdown */}
          <div className="md:col-span-2">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Bar: Sort Order & Active Filters Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 text-xs outline-none"
            >
              <option value="date_desc">Date (Newest first)</option>
              <option value="date_asc">Date (Oldest first)</option>
              <option value="amount_desc">Amount (Highest first)</option>
              <option value="amount_asc">Amount (Lowest first)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-rose-500 hover:underline inline-flex items-center gap-1 ml-2 cursor-pointer"
              >
                <X size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Filtered Totals Badge */}
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              {filteredTransactions.length} records
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(filteredSummary.income, symbol)}
            </span>
            <span className="text-rose-500">
              -{formatCurrency(filteredSummary.expense, symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List Grouped by Date */}
      <div className="space-y-4">
        {groupedByDate.length > 0 ? (
          groupedByDate.map((group) => {
            const dateObj = parseISO(group.date);
            const dateHeader = format(dateObj, 'EEEE, d MMMM yyyy');
            return (
              <div key={group.date} className="space-y-2">
                {/* Daily Subheader & Day Total */}
                <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>{dateHeader}</span>
                  </span>
                  <div className="flex items-center gap-2 tabular-nums">
                    {group.totalDayIncome > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(group.totalDayIncome, symbol)}
                      </span>
                    )}
                    {group.totalDayExpense > 0 && (
                      <span className="text-rose-500">
                        -{formatCurrency(group.totalDayExpense, symbol)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day's Transactions Cards */}
                <div className="fintech-card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {group.items.map((tx) => {
                    const cat = getCategoryById(tx.category);
                    const isExpense = tx.type === 'expense';
                    const acc = accounts.find((a) => a.id === tx.accountId);

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => openEditTransaction(tx)}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: cat?.color ?? '#64748b' }}
                          >
                            <CategoryIcon name={cat?.icon ?? 'CircleDollarSign'} size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {tx.description}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              <span>{cat?.name}</span>
                              <span>•</span>
                              <span>{acc?.name ?? tx.paymentMethod.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-sm sm:text-base font-extrabold tabular-nums ${
                              isExpense ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isExpense ? '-' : '+'}
                            {formatCurrency(tx.amount, symbol)}
                          </span>

                          {/* Quick Action Buttons (Edit / Delete) */}
                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEditTransaction(tx)}
                              title="Edit transaction"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTx(tx)}
                              title="Delete transaction"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="fintech-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ArrowUpDown size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No transactions found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No records match your active search or filter criteria. Try resetting filters.'
                  : 'Start tracking your financial cashflow by recording your first transaction.'}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openQuickAdd('expense')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
              >
                + Log First Expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete Transaction?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to permanently delete this entry?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {deletingTx.description}
              </div>
              <div className="text-slate-500">
                {formatCurrency(deletingTx.amount, symbol)} • {deletingTx.date}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
