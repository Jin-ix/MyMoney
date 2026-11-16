import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  format,
  parseISO,
  parse,
  isWithinInterval,
} from 'date-fns';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MonthSelector } from '@/components/ui/MonthSelector';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { getCategoryById } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { calculateCashFlow, isInternalTransfer } from '@/lib/finance/cashFlow';
import type { ViewPeriod } from '@/types';

export default function Reports() {
  const transactions = useStore((s) => s.transactions);
  const currentMonth = useStore((s) => s.currentMonth);
  const setCurrentMonth = useStore((s) => s.setCurrentMonth);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const startOfWeekSetting = useStore((s) => s.settings.startOfWeek);
  const isMobile = useIsMobile();

  const [period, setPeriod] = useState<ViewPeriod>('monthly');

  const { intervalStart, intervalEnd } = useMemo(() => {
    const now = new Date();
    const weekStartsOn = startOfWeekSetting === 'sunday' ? 0 : 1;
    if (period === 'weekly') {
      return {
        intervalStart: startOfWeek(now, { weekStartsOn }),
        intervalEnd: endOfWeek(now, { weekStartsOn }),
      };
    }
    if (period === 'yearly') {
      const ref = parse(currentMonth, 'yyyy-MM', now);
      return {
        intervalStart: startOfYear(ref),
        intervalEnd: endOfYear(ref),
      };
    }
    const ref = parse(currentMonth, 'yyyy-MM', now);
    return {
      intervalStart: startOfMonth(ref),
      intervalEnd: endOfMonth(ref),
    };
  }, [period, currentMonth, startOfWeekSetting]);

  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: intervalStart, end: intervalEnd });
    });
  }, [transactions, intervalStart, intervalEnd]);

  const summary = useMemo(() => {
    const cf = calculateCashFlow(periodTransactions);
    return {
      income: cf.operatingIncome,
      expenses: cf.operatingExpenses,
      net: cf.netCashFlow,
      savingsRate: cf.savingsRate ?? 0,
      transferVolume: cf.transferVolume,
    };
  }, [periodTransactions]);

  const barData = useMemo(() => {
    if (period === 'yearly') {
      const months = eachMonthOfInterval({ start: intervalStart, end: intervalEnd });
      return months.map((m) => {
        const key = format(m, 'yyyy-MM');
        const label = format(m, 'MMM');
        const monthTxs = periodTransactions.filter(
          (t) => t.date.startsWith(key) && !isInternalTransfer(t)
        );
        const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { label, income, expenses };
      });
    }

    const days = eachDayOfInterval({ start: intervalStart, end: intervalEnd });
    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const label = period === 'weekly' ? format(d, 'EEE') : format(d, 'd');
      const dayTxs = periodTransactions.filter(
        (t) => t.date === key && !isInternalTransfer(t)
      );
      const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { label, income, expenses };
    });
  }, [period, intervalStart, intervalEnd, periodTransactions]);

  const trendData = useMemo(() => {
    let cumulative = 0;
    return barData.map((d) => {
      cumulative += d.expenses;
      return { label: d.label, cumulative };
    });
  }, [barData]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodTransactions
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      });
    const totalExp = Array.from(map.values()).reduce((a, b) => a + b, 0);

    return Array.from(map.entries())
      .map(([catId, value]) => {
        const cat = getCategoryById(catId);
        const sharePct = totalExp > 0 ? Math.round((value / totalExp) * 100) : 0;
        return {
          id: catId,
          name: cat?.name ?? catId,
          icon: cat?.icon ?? 'MoreHorizontal',
          value,
          sharePct,
          color: cat?.color ?? '#6b7280',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Top 5 largest expenses in period (excluding internal transfers)
  const topExpenses = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodTransactions]);

  // Export period CSV
  const handleExportCSV = () => {
    if (periodTransactions.length === 0) return;
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Description'];
    const rows = periodTransactions.map((t) => [
      t.date,
      t.type,
      t.amount,
      t.category,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mymoney-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chartHeight = isMobile ? 220 : 280;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header + Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Cashflow distribution, category expenditure burn, and trend curves
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Period Tabs */}
          <div className="inline-flex bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
            {(['weekly', 'monthly', 'yearly'] as ViewPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  period === p
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {period !== 'weekly' && (
            <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={periodTransactions.length === 0}
            className="min-h-[38px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inflow</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownRight size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-tabular">
            {formatCurrency(summary.income, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            From all logged credits
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outflow</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-tabular">
            {formatCurrency(summary.expenses, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Across {periodTransactions.filter((t) => t.type === 'expense').length} debits
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cashflow</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet size={14} />
            </span>
          </div>
          <p
            className={`text-lg sm:text-2xl font-bold font-tabular ${
              summary.net >= 0
                ? 'text-gray-900 dark:text-white'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.net < 0 ? '-' : '+'}
            {formatCurrency(Math.abs(summary.net), symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            {summary.net >= 0 ? 'Net capital surplus' : 'Net capital deficit'}
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Savings Rate</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Percent size={14} />
            </span>
          </div>
          <p
            className={`text-lg sm:text-2xl font-bold font-tabular ${
              summary.savingsRate >= 20
                ? 'text-emerald-600 dark:text-emerald-400'
                : summary.savingsRate > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.savingsRate}%
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Target benchmark: &ge; 20%
          </span>
        </div>
      </div>

      {periodTransactions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Income vs Expenses Bar Chart */}
          <div className="fintech-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Cashflow Inflow vs Outflow
              </h2>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Inflow
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Outflow
                </span>
              </div>
            </div>

            <div style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    interval={period === 'monthly' && isMobile ? 4 : 0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: unknown) => formatCurrency(Number(val), symbol)}
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="income" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown Donut Chart */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-4">
              Category Spending Distribution
            </h2>
            {categoryBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div style={{ height: 210 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => formatCurrency(Number(val), symbol)}
                        contentStyle={{
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categoryBreakdown.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-slate-200 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-tabular">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.value, symbol)}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 ml-1.5">
                          ({item.sharePct}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                No expenses recorded for this period
              </div>
            )}
          </div>

          {/* Cumulative Spending Trend Line Chart */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-4">
              Cumulative Expense Burn Curve
            </h2>
            <div style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    interval={period === 'monthly' && isMobile ? 4 : 0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: unknown) => formatCurrency(Number(val), symbol)}
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative Spend"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Peak Expenses */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-4">
              Largest Expenses In Period
            </h2>
            {topExpenses.length > 0 ? (
              <div className="space-y-2.5">
                {topExpenses.map((tx) => {
                  const cat = getCategoryById(tx.category);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                        >
                          <CategoryIcon name={cat?.icon ?? 'MoreHorizontal'} size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {tx.description || cat?.name || 'Expense'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {tx.date} • {cat?.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-tabular shrink-0">
                        -{formatCurrency(tx.amount, symbol)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                No expense transactions found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="fintech-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No activity logged for this time window
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            As soon as you record income or expense transactions in this range, interactive cashflow charts and category analytics will populate automatically.
          </p>
        </div>
      )}
    </div>
  );
}
