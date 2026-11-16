import { useState, useMemo } from 'react';
import {
  Plus,
  Repeat,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  CreditCard,
  Sparkles,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Pencil,
  Filter,
} from 'lucide-react';
import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  isBefore,
  isToday,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Select } from '@/components/ui/Select';
import { getCategoryById, getCategoriesByType } from '@/lib/categories';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { RecurringPayment } from '@/types';

const FREQUENCIES: Array<{ value: RecurringPayment['frequency']; label: string; monthlyMultiplier: number }> = [
  { value: 'daily', label: 'Daily', monthlyMultiplier: 30 },
  { value: 'weekly', label: 'Weekly', monthlyMultiplier: 4.33 },
  { value: 'biweekly', label: 'Every 2 Weeks', monthlyMultiplier: 2.16 },
  { value: 'monthly', label: 'Monthly', monthlyMultiplier: 1 },
  { value: 'quarterly', label: 'Quarterly (Every 3 Mo)', monthlyMultiplier: 1 / 3 },
  { value: 'yearly', label: 'Yearly (Annual)', monthlyMultiplier: 1 / 12 },
];

function getNextOccurrence(dateStr: string, freq: RecurringPayment['frequency']): string {
  const date = parseISO(dateStr);
  switch (freq) {
    case 'daily':
      return format(addDays(date, 1), 'yyyy-MM-dd');
    case 'weekly':
      return format(addWeeks(date, 1), 'yyyy-MM-dd');
    case 'biweekly':
      return format(addWeeks(date, 2), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd');
    case 'quarterly':
      return format(addMonths(date, 3), 'yyyy-MM-dd');
    case 'yearly':
      return format(addYears(date, 1), 'yyyy-MM-dd');
  }
}

export default function RecurringPayments() {
  const recurringPayments = useStore((s) => s.recurringPayments);
  const accounts = useStore((s) => s.accounts);
  const addRecurringPayment = useStore((s) => s.addRecurringPayment);
  const updateRecurringPayment = useStore((s) => s.updateRecurringPayment);
  const deleteRecurringPayment = useStore((s) => s.deleteRecurringPayment);
  const markRecurringPaymentPaid = useStore((s) => s.markRecurringPaymentPaid);
  const addTransaction = useStore((s) => s.addTransaction);
  const showToast = useStore((s) => s.showToast);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const dateFormat = useStore((s) => s.settings.dateFormat);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('subscriptions');
  const [frequency, setFrequency] = useState<RecurringPayment['frequency']>('monthly');
  const [nextDate, setNextDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RecurringPayment | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming'>('all');

  // Compute Run-rate Metrics
  const metrics = useMemo(() => {
    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    let activeCount = 0;
    let upcomingDueCount = 0;
    const today = new Date();

    for (const p of recurringPayments) {
      if (!p.isActive) continue;
      activeCount++;

      const freqMeta = FREQUENCIES.find((f) => f.value === p.frequency);
      const mult = freqMeta?.monthlyMultiplier || 1;
      const normalizedMonthly = p.amount * mult;

      if (p.type === 'income') {
        monthlyIncome += normalizedMonthly;
      } else {
        monthlyExpenses += normalizedMonthly;
      }

      // Check if due within next 7 days
      try {
        const dueDate = parseISO(p.nextDate);
        const daysDiff = differenceInDays(dueDate, today);
        if (daysDiff >= 0 && daysDiff <= 7) {
          upcomingDueCount++;
        }
      } catch {
        // ignore date parse issues
      }
    }

    const annualExpenses = monthlyExpenses * 12;

    return {
      monthlyExpenses: Math.round(monthlyExpenses),
      annualExpenses: Math.round(annualExpenses),
      monthlyIncome: Math.round(monthlyIncome),
      activeCount,
      upcomingDueCount,
    };
  }, [recurringPayments]);

  // Filtered List
  const displayedPayments = useMemo(() => {
    const today = new Date();
    return recurringPayments.filter((p) => {
      if (statusFilter === 'active') return p.isActive;
      if (statusFilter === 'upcoming') {
        if (!p.isActive) return false;
        try {
          const d = parseISO(p.nextDate);
          const diff = differenceInDays(d, today);
          return diff >= 0 && diff <= 7;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [recurringPayments, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setAmount('');
    setType('expense');
    setCategory('subscriptions');
    setFrequency('monthly');
    setNextDate(format(new Date(), 'yyyy-MM-dd'));
    setAccountId(accounts[0]?.id || '');
    setError('');
    setIsOpen(true);
  };

  const openEdit = (p: RecurringPayment) => {
    setEditing(p);
    setName(p.name);
    setAmount(String(p.amount));
    setType(p.type);
    setCategory(p.category);
    setFrequency(p.frequency);
    setNextDate(p.nextDate);
    setAccountId(p.accountId || accounts[0]?.id || '');
    setError('');
    setIsOpen(true);
  };

  const handleMarkPaid = (p: RecurringPayment) => {
    const success = markRecurringPaymentPaid(p.id, p.nextDate);
    if (success) {
      showToast(`Logged ${p.name} (${formatCurrency(p.amount, symbol)}) & advanced due date`);
    } else {
      showToast(`${p.name} has already been logged for this billing cycle`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setError('Please provide a name for this recurring obligation');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const originalDay = parseISO(nextDate).getDate();

    const payload = {
      name: name.trim(),
      amount: parsedAmount,
      type,
      category,
      frequency,
      nextDate,
      nextDueDate: nextDate,
      originalBillingDay: originalDay,
      accountId: accountId || accounts[0]?.id || '',
      isActive: editing ? editing.isActive : true,
    };

    if (editing) {
      updateRecurringPayment(editing.id, payload);
      showToast(`Updated ${name.trim()}`);
    } else {
      addRecurringPayment(payload);
      showToast(`Added ${name.trim()}`);
    }
    setIsOpen(false);
  };

  const categories = getCategoriesByType(type);

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Recurring Payments & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Automated obligations, subscriptions run-rate, and scheduled bills
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>New Obligation</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Run-rate</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Repeat size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular">
            {formatCurrency(metrics.monthlyExpenses, symbol)}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">/mo</span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Normalized monthly burn
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Annualized Burn</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular">
            {formatCurrency(metrics.annualExpenses, symbol)}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">/yr</span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Over full 12-month horizon
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Commitments</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-tabular">
            {metrics.activeCount}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400 ml-1.5">
              of {recurringPayments.length} total
            </span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Live recurring obligations
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Due This Week</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 font-tabular">
            {metrics.upcomingDueCount}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400 ml-1.5">bills</span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Scheduled within 7 days
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
          {[
            { id: 'all', label: `All (${recurringPayments.length})` },
            { id: 'active', label: `Active (${metrics.activeCount})` },
            { id: 'upcoming', label: `Due Soon (${metrics.upcomingDueCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`min-h-[34px] px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recurring Cards Grid */}
      {displayedPayments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPayments.map((p) => {
            const cat = getCategoryById(p.category);
            const targetAccount = accounts.find((a) => a.id === p.accountId);

            // Compute due urgency
            let daysUntil = 0;
            let isPastDue = false;
            let isDueToday = false;
            try {
              const d = parseISO(p.nextDate);
              isPastDue = isBefore(d, new Date()) && !isToday(d);
              isDueToday = isToday(d);
              daysUntil = differenceInDays(d, new Date());
            } catch {
              // fallback
            }

            return (
              <div
                key={p.id}
                className={`fintech-card fintech-card-interactive p-5 flex flex-col justify-between transition-all ${
                  !p.isActive ? 'opacity-65 bg-gray-50/50 dark:bg-slate-900/50' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      onClick={() => openEdit(p)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openEdit(p);
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                      >
                        <CategoryIcon name={cat?.icon ?? 'Repeat'} size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {cat?.name || p.category} {targetAccount ? `• ${targetAccount.name}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Card actions: edit, delete, active switch */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        aria-label={`Edit ${p.name}`}
                        title="Edit obligation"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Delete ${p.name}`}
                        title="Delete obligation"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.isActive}
                        aria-label={`Toggle ${p.name}`}
                        onClick={() => {
                          updateRecurringPayment(p.id, { isActive: !p.isActive });
                          showToast(`${p.name} marked ${!p.isActive ? 'Active' : 'Paused'}`);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          p.isActive ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            p.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Amount and Frequency pill */}
                  <div className="flex items-baseline justify-between mt-3 mb-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        Billing Amount
                      </span>
                      <p
                        className={`text-2xl font-bold font-tabular mt-0.5 ${
                          p.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {p.type === 'income' ? '+' : '-'}
                        {formatCurrency(p.amount, symbol)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-semibold capitalize">
                        {p.frequency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with Next Due & Mark Paid Button */}
                <div className="pt-3.5 mt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar size={13} className="text-gray-400" />
                    <span className="text-gray-500 dark:text-slate-400">
                      Next: <strong className="text-gray-700 dark:text-slate-200">{formatDate(p.nextDate, dateFormat)}</strong>
                    </span>
                    {p.isActive && (
                      <span
                        className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          isPastDue
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            : isDueToday
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : daysUntil <= 7
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {isPastDue
                          ? 'Past Due'
                          : isDueToday
                          ? 'Due Today'
                          : daysUntil <= 7
                          ? `In ${daysUntil}d`
                          : ''}
                      </span>
                    )}
                  </div>

                  {p.isActive && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(p)}
                      className="min-h-[34px] px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>{p.type === 'income' ? 'Log Inflow' : 'Mark Paid & Log'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fintech-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Repeat size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No recurring payments configured
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Log your regular monthly subscriptions (Netflix, Spotify, iCloud), rent, utilities, or recurring salary credits to never miss a due date.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Recurring Payment</span>
          </button>
        </div>
      )}

      {/* Add / Edit Recurring Payment Modal */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Edit Recurring Obligation' : 'Add Recurring Payment'}
      >
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          {/* Segmented Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory(getCategoriesByType('expense')[0].id);
              }}
              className={`min-h-[40px] rounded-lg text-sm font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Outgoing Bill / Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory(getCategoriesByType('income')[0].id);
              }}
              className={`min-h-[40px] rounded-lg text-sm font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Recurring Inflow / Salary
            </button>
          </div>

          <div>
            <label
              htmlFor="rp-name"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Obligation Name
            </label>
            <input
              id="rp-name"
              type="text"
              placeholder="e.g. Netflix, Gym Membership, House Rent"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rp-amount"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Amount ({symbol})
              </label>
              <input
                id="rp-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                  if (error) setError('');
                }}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="rp-freq"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Frequency Cadence
              </label>
              <Select
                id="rp-freq"
                value={frequency}
                onChange={(val) => setFrequency(val as RecurringPayment['frequency'])}
                options={FREQUENCIES.map((f) => ({
                  value: f.value,
                  label: f.label,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rp-cat"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Category
              </label>
              <Select
                id="rp-cat"
                value={category}
                onChange={setCategory}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                }))}
              />
            </div>

            <div>
              <label
                htmlFor="rp-date"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Next Due Date
              </label>
              <input
                id="rp-date"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label
                htmlFor="rp-account"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Default Payment Account
              </label>
              <Select
                id="rp-account"
                value={accountId}
                onChange={setAccountId}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${formatCurrency(a.balance, symbol)})`,
                }))}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-3">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  deleteRecurringPayment(editing.id);
                  showToast(`Deleted ${editing.name}`);
                  setIsOpen(false);
                }}
                className="min-h-[48px] px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold shadow-xs transition-all cursor-pointer"
            >
              {editing ? 'Save Changes' : 'Confirm Obligation'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Obligation"
      >
        {deleteTarget && (
          <div className="space-y-5 pb-2">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Delete “{deleteTarget.name}”?
                </p>
                <p className="text-[13px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                  This will permanently remove the recurring obligation
                  {deleteTarget.isActive ? ' and stop future reminders' : ''}. Past transactions
                  already logged will not be affected.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteRecurringPayment(deleteTarget.id);
                  showToast(`Deleted ${deleteTarget.name}`);
                  setDeleteTarget(null);
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
