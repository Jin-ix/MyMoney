import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Plus,
  Check,
  Sparkles,
  MessageSquareText,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Repeat,
  Shield,
  CreditCard,
  Building2,
  Calendar as CalendarIcon,
  Search,
  Bot,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { MonthSelector } from '@/components/ui/MonthSelector';
import { CalendarClockWidget } from '@/components/ui/CalendarClockWidget';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CardSkeleton, TransactionSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById, PAYMENT_METHODS } from '@/lib/categories';
import { formatCurrency, formatShortDate, getGreeting, isInMonth, clampPercentage } from '@/lib/utils';
import { calculateNetWorth } from '@/lib/finance/netWorth';
import { calculateCashFlow, isInternalTransfer } from '@/lib/finance/cashFlow';
import { calculateCategorySpent } from '@/lib/finance/budgetCalculations';
import type { Transaction } from '@/types';

const QUICK_CHIPS = [50, 100, 500, 1000];

export default function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const accounts = useStore((s) => s.accounts);
  const savingsGoals = useStore((s) => s.savingsGoals);
  const recurringPayments = useStore((s) => s.recurringPayments);
  const updateSavingsGoal = useStore((s) => s.updateSavingsGoal);
  const updateRecurringPayment = useStore((s) => s.updateRecurringPayment);
  const currentMonth = useStore((s) => s.currentMonth);
  const setCurrentMonth = useStore((s) => s.setCurrentMonth);
  const isLoading = useStore((s) => s.isLoading);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const addTransaction = useStore((s) => s.addTransaction);
  const openQuickAdd = useStore((s) => s.openQuickAdd);
  const openEditTransaction = useStore((s) => s.openEditTransaction);
  const showToast = useStore((s) => s.showToast);

  const [hideBalances, setHideBalances] = useState(false);
  const [goalsTab, setGoalsTab] = useState<'goals' | 'bills'>('goals');
  const [selectedDonutCategory, setSelectedDonutCategory] = useState<string | null>(null);

  // Inline Quick Expense state
  const [spendType, setSpendType] = useState<'expense' | 'income'>('expense');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [spendAccountId, setSpendAccountId] = useState('');
  const [spendDate, setSpendDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [spendRemarks, setSpendRemarks] = useState('');
  const [spendError, setSpendError] = useState('');

  // Transactions for current month
  const monthTransactions = useMemo(
    () => transactions.filter((t) => isInMonth(t.date, currentMonth)),
    [transactions, currentMonth]
  );

  // Totals & counts via Financial Engine (excluding non-operating transfers/repayments)
  const { totalIncome, totalExpenses, incomeCount, expenseCount, netSavings, savingsRate } = useMemo(() => {
    const cf = calculateCashFlow(monthTransactions);
    let inCount = 0;
    let expCount = 0;
    for (const t of monthTransactions) {
      if (isInternalTransfer(t)) continue;
      if (t.type === 'income') inCount++;
      else if (t.type === 'expense') expCount++;
    }
    return {
      totalIncome: cf.operatingIncome,
      totalExpenses: cf.operatingExpenses,
      incomeCount: inCount,
      expenseCount: expCount,
      netSavings: cf.netCashFlow,
      savingsRate: cf.savingsRate,
    };
  }, [monthTransactions]);

  // Section B: Net Worth vs Assets vs Liabilities
  const { totalAssets, totalLiabilities, netWorth, liquidBalance } = useMemo(() => {
    if (accounts.length > 0) {
      return calculateNetWorth(accounts);
    }
    // Fallback if no account records exist
    const net = monthTransactions.reduce(
      (sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount),
      0
    );
    return {
      totalAssets: net > 0 ? net : 0,
      totalLiabilities: net < 0 ? Math.abs(net) : 0,
      netWorth: net,
      liquidBalance: net,
      debtToAssetRatio: 0,
    };
  }, [accounts, monthTransactions]);

  // Budgets (with refund netting and transfer exclusion)
  const monthBudgets = useMemo(() => {
    return budgets
      .filter((b) => b.month === currentMonth)
      .map((b) => {
        const spent = calculateCategorySpent(monthTransactions, b.category);
        return { ...b, spent };
      });
  }, [budgets, monthTransactions, currentMonth]);

  const budgetProgress = useMemo(() => {
    const totalAllocated = monthBudgets.reduce((s, b) => s + b.allocated, 0);
    const totalSpent = monthBudgets.reduce((s, b) => s + b.spent, 0);
    const remaining = Math.max(0, totalAllocated - totalSpent);
    const pct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
    return { totalAllocated, totalSpent, remaining, pct };
  }, [monthBudgets]);

  // Spending Breakdown
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([catId, value]) => {
        const cat = getCategoryById(catId);
        return {
          id: catId,
          name: cat?.name ?? catId,
          value,
          color: cat?.color ?? '#6b7280',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // Daily Cashflow Analytics Chart Data
  const dailyCashflowData = useMemo(() => {
    try {
      const monthStart = startOfMonth(parseISO(`${currentMonth}-01`));
      const monthEnd = endOfMonth(monthStart);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const dayMap: Record<string, { income: number; expense: number }> = {};
      days.forEach((d) => {
        const key = format(d, 'yyyy-MM-dd');
        dayMap[key] = { income: 0, expense: 0 };
      });

      monthTransactions.forEach((t) => {
        if (dayMap[t.date]) {
          if (t.type === 'income') dayMap[t.date].income += t.amount;
          else dayMap[t.date].expense += t.amount;
        }
      });

      return Object.entries(dayMap).map(([date, vals]) => ({
        day: date.slice(8, 10),
        date,
        income: vals.income,
        expense: vals.expense,
      }));
    } catch {
      return [];
    }
  }, [currentMonth, monthTransactions]);

  // Recent Transactions
  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [transactions]
  );

  // Actual Computed Artha AI Financial Insights
  const realFinancialInsights = useMemo(() => {
    const list: Array<{ title: string; detail: string; tone: 'positive' | 'warning' | 'neutral' }> = [];

    // 1. Savings rate insight
    if (savingsRate !== null) {
      if (savingsRate >= 20) {
        list.push({
          title: 'Strong Savings Discipline',
          detail: `You have saved ${savingsRate}% of your income this month, outperforming the recommended 20% benchmark.`,
          tone: 'positive',
        });
      } else if (savingsRate < 0) {
        list.push({
          title: 'Cashflow Deficit',
          detail: `Outflows exceed income by ${formatCurrency(Math.abs(netSavings), symbol)} this month. Consider reviewing non-essential spending.`,
          tone: 'warning',
        });
      }
    }

    // 2. Top spending category
    if (expenseBreakdown.length > 0 && totalExpenses > 0) {
      const top = expenseBreakdown[0];
      const topPct = Math.round((top.value / totalExpenses) * 100);
      list.push({
        title: `Highest Outflow: ${top.name}`,
        detail: `${top.name} represents ${topPct}% (${formatCurrency(top.value, symbol)}) of your total spending this month.`,
        tone: topPct > 40 ? 'warning' : 'neutral',
      });
    }

    // 3. Upcoming bills due soon
    const upcomingSoon = recurringPayments.filter((p) => p.isActive && p.type === 'expense');
    if (upcomingSoon.length > 0) {
      const nextBill = upcomingSoon[0];
      list.push({
        title: `Upcoming Bill: ${nextBill.name}`,
        detail: `${formatCurrency(nextBill.amount, symbol)} scheduled on ${nextBill.nextDate} (${nextBill.frequency}).`,
        tone: 'neutral',
      });
    }

    return list;
  }, [savingsRate, netSavings, totalExpenses, expenseBreakdown, recurringPayments, symbol]);

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(spendAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setSpendError('Please enter a valid amount greater than 0');
      return;
    }

    const categoriesList = spendType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const catName = categoriesList.find((c) => c.id === spendCategory)?.name ?? 'Transaction';

    addTransaction({
      type: spendType,
      amount: parsed,
      category: spendCategory,
      description: spendRemarks.trim() || catName,
      date: spendDate || format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'upi',
      accountId: spendAccountId || (accounts[0]?.id ?? ''),
    });

    showToast(`✓ Saved ${symbol}${parsed} under ${catName}`);
    setSpendAmount('');
    setSpendRemarks('');
    setSpendError('');
  };

  const maskValue = (val: string) => (hideBalances ? '••••••' : val);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ChartSkeleton />
        <div className="space-y-2">
          <TransactionSkeleton />
          <TransactionSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* SECTION A: WELCOME HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your personal wealth intelligence and cashflow overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>
      </div>

      {/* SECTION B: NET WORTH & LIQUID ASSETS HERO ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero Card: Net Worth & Liquid Balance */}
        <div className="lg:col-span-7 hero-balance-card text-white p-4.5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20">
                <Shield size={14} className="text-emerald-200" />
                <span className="text-xs font-bold tracking-wide">
                  Total Net Worth
                </span>
              </div>

              <button
                type="button"
                onClick={() => setHideBalances((v) => !v)}
                aria-label={hideBalances ? 'Reveal financial figures' : 'Hide financial figures'}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
              >
                {hideBalances ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <p className="text-2xl sm:text-4xl font-black tracking-tight tabular-nums">
              {hideBalances
                ? `${symbol} ••••••`
                : `${netWorth < 0 ? '-' : ''}${formatCurrency(Math.abs(netWorth), symbol)}`}
            </p>

            {/* Assets vs Liabilities Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/15 text-xs">
              <div className="min-w-0">
                <span className="text-emerald-200 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider truncate">
                  Total Assets
                </span>
                <span className="font-extrabold text-xs sm:text-sm tabular-nums mt-0.5 block truncate">
                  {maskValue(formatCurrency(totalAssets, symbol))}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-rose-200 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider truncate">
                  Liabilities
                </span>
                <span className="font-extrabold text-xs sm:text-sm tabular-nums mt-0.5 block truncate">
                  {maskValue(formatCurrency(totalLiabilities, symbol))}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-teal-200 text-[10px] sm:text-[11px] font-semibold block uppercase tracking-wider truncate">
                  Liquid Funds
                </span>
                <span className="font-extrabold text-xs sm:text-sm tabular-nums mt-0.5 block truncate">
                  {maskValue(formatCurrency(liquidBalance, symbol))}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 mt-4 sm:mt-5">
            <button
              type="button"
              onClick={() => openQuickAdd('expense')}
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-white !text-emerald-950 hover:bg-emerald-50 active:scale-[0.98] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-black/15 transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>Log Expense</span>
            </button>
            <button
              type="button"
              onClick={() => openQuickAdd('income')}
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white border border-white/30 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Income</span>
            </button>
          </div>
        </div>

        {/* SECTION I: COMPACT ARTHA AI FINANCIAL INSIGHTS CARD */}
        <div className="lg:col-span-5 fintech-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Bot size={17} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Artha AI Intelligence
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Calculated from your live financial records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Chat</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-2.5">
              {realFinancialInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-xs border ${
                    insight.tone === 'positive'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                      : insight.tone === 'warning'
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {insight.tone === 'positive' && <CheckCircle2 size={13} className="text-emerald-600" />}
                    {insight.tone === 'warning' && <AlertTriangle size={13} className="text-amber-600" />}
                    {insight.tone === 'neutral' && <Sparkles size={13} className="text-teal-600" />}
                    <span>{insight.title}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                    {insight.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ask: "Can I afford ₹5,000?"</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Offline Verified ✓</span>
          </div>
        </div>
      </div>

      {/* SECTION C: 4 FINANCIAL STATISTIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Monthly Income */}
        <div className="fintech-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
              {maskValue(formatCurrency(totalIncome, symbol))}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {incomeCount} {incomeCount === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="fintech-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-extrabold text-rose-500 dark:text-rose-400 tabular-nums truncate">
              {maskValue(formatCurrency(totalExpenses, symbol))}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {expenseCount} {expenseCount === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
        </div>

        {/* Net Savings */}
        <div className="fintech-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Cashflow</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p
              className={`text-lg sm:text-xl font-extrabold tabular-nums truncate ${
                netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`}
            >
              {maskValue(`${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings, symbol)}`)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {netSavings >= 0 ? 'Net surplus retained' : 'Net monthly deficit'}
            </p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="fintech-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Savings Rate</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
              {savingsRate !== null ? `${savingsRate}%` : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {savingsRate !== null && savingsRate >= 20 ? 'Above target benchmark' : 'Target is 20%+'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION E: QUICK TRANSACTION ENTRY */}
      <section className="fintech-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Plus size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                Quick Transaction Entry
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Log spending or income directly with instant balance reconciliation
              </p>
            </div>
          </div>
          {/* Income vs Expense Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold self-start sm:self-auto shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSpendType('expense');
                setSpendCategory(EXPENSE_CATEGORIES[0].id);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                spendType === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setSpendType('income');
                setSpendCategory(INCOME_CATEGORIES[0].id);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                spendType === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickExpenseSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Amount Input */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({symbol})
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 px-3.5 h-11 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20">
                <span className="text-base font-bold text-slate-400 mr-2">{symbol}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={spendAmount}
                  onChange={(e) => {
                    setSpendAmount(e.target.value.replace(/[^0-9.]/g, ''));
                    if (spendError) setSpendError('');
                  }}
                  className="w-full text-lg font-bold text-slate-900 dark:text-white bg-transparent outline-none border-none shadow-none"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(spendAmount || '0') || 0;
                      setSpendAmount(String(cur + chip));
                      if (spendError) setSpendError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    +{symbol}{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Selector & Date */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account &amp; Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={spendAccountId}
                  onChange={(e) => setSpendAccountId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600"
                >
                  <option value="">Default Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance, symbol)})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={spendDate}
                  onChange={(e) => setSpendDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Description / Remarks */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch with team"
                value={spendRemarks}
                onChange={(e) => setSpendRemarks(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Category Chips Bar */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {(spendType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => {
                const isSelected = spendCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSpendCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} size={14} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {spendError && (
            <p className="text-xs font-semibold text-rose-500">{spendError}</p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Check size={16} />
              <span>{spendType === 'income' ? 'Save Income' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION D: CASHFLOW ANALYTICS & SECTION F: BUDGET OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cashflow Analytics: Income vs Expense Daily Bars */}
        <div className="lg:col-span-7 fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Daily Cashflow Trajectory
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inflows (Emerald) vs Outflows (Rose) across {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCashflowData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val), symbol)]}
                  labelFormatter={(lbl) => `Day ${lbl}`}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(51, 65, 85, 0.8)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Overview Progress Card */}
        <div className="lg:col-span-5 fintech-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Monthly Budget Status
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allocated limits vs current burn
                </p>
              </div>
              <Link
                to="/budgets"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {budgetProgress.totalAllocated > 0 ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {formatCurrency(budgetProgress.totalSpent, symbol)} spent of {formatCurrency(budgetProgress.totalAllocated, symbol)}
                    </span>
                    <span
                      className={`tabular-nums font-bold ${
                        budgetProgress.pct > 100
                          ? 'text-rose-500'
                          : budgetProgress.pct >= 80
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {budgetProgress.pct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetProgress.pct > 100
                          ? 'bg-rose-500'
                          : budgetProgress.pct >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${clampPercentage(budgetProgress.pct)}%` }}
                    />
                  </div>
                </div>

                {/* Top Category Budgets Mini-Bars */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {monthBudgets.slice(0, 3).map((b) => {
                    const cat = getCategoryById(b.category);
                    const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
                    return (
                      <div key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="truncate text-slate-700 dark:text-slate-300">{cat?.name ?? b.category}</span>
                          <span className="tabular-nums font-semibold text-slate-500">
                            {formatCurrency(b.spent, symbol)} / {formatCurrency(b.allocated, symbol)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${clampPercentage(pct)}%`,
                              backgroundColor: pct > 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : cat?.color ?? '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No monthly budgets established for this cycle.
                </p>
                <Link
                  to="/budgets"
                  className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                >
                  Set Budget
                </Link>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Remaining Buffer:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(budgetProgress.remaining, symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION G & H: SPENDING BREAKDOWN, CALENDAR & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Section G: Spending Breakdown Donut Chart */}
        <div className="lg:col-span-5 fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Category Breakdown
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click a slice to filter related items
              </p>
            </div>
            {selectedDonutCategory && (
              <button
                type="button"
                onClick={() => setSelectedDonutCategory(null)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {expenseBreakdown.length > 0 ? (
            <div>
              <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      onClick={(entry: any) => setSelectedDonutCategory(entry?.id ?? null)}
                      cursor="pointer"
                    >
                      {expenseBreakdown.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          stroke={selectedDonutCategory === entry.id ? '#ffffff' : 'transparent'}
                          strokeWidth={selectedDonutCategory === entry.id ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [formatCurrency(Number(val), symbol)]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(51, 65, 85, 0.8)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list */}
              <div className="space-y-1.5 pt-2 max-h-40 overflow-y-auto">
                {expenseBreakdown.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDonutCategory(item.id)}
                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-colors ${
                      selectedDonutCategory === item.id ? 'bg-emerald-50 dark:bg-emerald-950/50 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="tabular-nums font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                      {formatCurrency(item.value, symbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
              No expenses recorded for this month.
            </div>
          )}
        </div>

        {/* Section H: Live Calendar & Clock Widget */}
        <div className="lg:col-span-7">
          <CalendarClockWidget />
        </div>
      </div>

      {/* SECTION H (PART 2): RECENT TRANSACTIONS & GOALS/BILLS TABS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Transactions Table / Cards */}
        <div className="lg:col-span-7 fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Transactions
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tap any transaction to edit details or account
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => {
                const cat = getCategoryById(tx.category);
                const isExpense = tx.type === 'expense';
                return (
                  <div
                    key={tx.id}
                    onClick={() => openEditTransaction(tx)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat?.color ?? '#64748b' }}
                      >
                        <CategoryIcon name={cat?.icon ?? 'CircleDollarSign'} size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {cat?.name} • {formatShortDate(tx.date)} • {tx.paymentMethod.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p
                        className={`text-xs sm:text-sm font-black tabular-nums ${
                          isExpense ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(tx.amount, symbol)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Goals & Upcoming Bills Mini-Tabs */}
        <div className="lg:col-span-5 fintech-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGoalsTab('goals')}
                  className={`text-xs font-bold pb-1 cursor-pointer transition-colors border-b-2 ${
                    goalsTab === 'goals'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Savings Goals
                </button>
                <button
                  type="button"
                  onClick={() => setGoalsTab('bills')}
                  className={`text-xs font-bold pb-1 cursor-pointer transition-colors border-b-2 ${
                    goalsTab === 'bills'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Upcoming Bills
                </button>
              </div>

              <Link
                to={goalsTab === 'goals' ? '/savings-goals' : '/recurring-payments'}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                View
              </Link>
            </div>

            {goalsTab === 'goals' ? (
              <div className="space-y-3">
                {savingsGoals.length > 0 ? (
                  savingsGoals.slice(0, 3).map((g) => {
                    const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                    return (
                      <div key={g.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-900 dark:text-white truncate">{g.name}</span>
                          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${clampPercentage(pct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{formatCurrency(g.currentAmount, symbol)}</span>
                          <span>Target: {formatCurrency(g.targetAmount, symbol)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">No savings targets set yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recurringPayments.filter((p) => p.isActive).length > 0 ? (
                  recurringPayments
                    .filter((p) => p.isActive)
                    .slice(0, 3)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-[11px] text-slate-500">Due: {p.nextDate} ({p.frequency})</p>
                        </div>
                        <span className="font-extrabold text-rose-500 tabular-nums">
                          -{formatCurrency(p.amount, symbol)}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">No upcoming subscriptions recorded.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
