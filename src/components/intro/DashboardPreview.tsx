import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  BadgeCheck,
} from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SpendingChartPreview } from './SpendingChartPreview';
import { FloatingMetricCard } from './FloatingMetricCard';
import { formatCurrency } from '@/lib/utils';

const STATS = [
  {
    label: 'Total Balance',
    value: formatCurrency(84650),
    icon: Wallet,
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  },
  {
    label: 'Income',
    value: `+${formatCurrency(45000)}`,
    icon: ArrowDownLeft,
    chip: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
  },
  {
    label: 'Expenses',
    value: `−${formatCurrency(18450)}`,
    icon: ArrowUpRight,
    chip: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  },
  {
    label: 'Net Savings',
    value: `+${formatCurrency(26550)}`,
    icon: PiggyBank,
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  },
];

const TRANSACTIONS = [
  { icon: 'UtensilsCrossed', name: 'Food & Dining', note: 'Lunch · Today', amount: '-₹450' },
  { icon: 'Car', name: 'Transport', note: 'Metro card · Yesterday', amount: '-₹180' },
  { icon: 'ShoppingBag', name: 'Shopping', note: 'Weekend haul · 12 Nov', amount: '-₹1,200' },
  { icon: 'Briefcase', name: 'Salary', note: 'Monthly payout · 1 Nov', amount: '+₹45,000', income: true },
];

export function DashboardPreview() {
  const budgetPct = Math.round((16200 / 25000) * 100);

  return (
    <div className="relative w-full max-w-[560px] mx-auto lg:max-w-none">
      {/* Ambient glow behind the panel */}
      <div
        className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),rgba(34,211,238,0.07),transparent)] blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Floating metric cards */}
      <FloatingMetricCard
        title="Monthly savings"
        value={formatCurrency(26550)}
        hint="59% of income kept"
        className="intro-float-slow -top-5 -right-2 sm:-right-6 hidden md:block"
      />
      <FloatingMetricCard
        title="Budget status"
        value="On Track"
        hint="65% of monthly budget used"
        tone="cyan"
        className="intro-float -left-3 sm:-left-8 top-1/3 hidden md:block"
        delayClass="[animation-delay:-3s]"
      />
      <FloatingMetricCard
        title="Spending insight"
        value="12% less"
        hint="than last month"
        className="intro-float-slow -bottom-5 left-6 sm:left-10 hidden md:block"
        delayClass="[animation-delay:-5.5s]"
      />

      {/* Main dashboard panel */}
      <div className="relative rounded-3xl bg-[#0B1522]/90 border border-white/10 backdrop-blur-xl shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center">
              <Wallet size={15} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Overview</p>
              <p className="text-[10px] text-[#718096] leading-tight">November 2026</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-semibold text-[#A6B3C3]">
            <BadgeCheck size={11} className="text-emerald-400" />
            Preview data
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {STATS.map(({ label, value, icon: Icon, chip }) => (
              <div
                key={label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 min-w-0"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#718096] truncate">
                    {label}
                  </span>
                  <span className={`w-6 h-6 rounded-md border flex items-center justify-center ${chip}`}>
                    <Icon size={12} />
                  </span>
                </div>
                <p className="text-sm sm:text-[15px] font-extrabold text-white tabular-nums truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Spending chart */}
          <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3.5">
            <SpendingChartPreview />
          </div>

          {/* Budget progress */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#718096]">
                Monthly Budget
              </span>
              <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                {formatCurrency(8800)} left
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#A6B3C3] tabular-nums">
              <span>Spent {formatCurrency(16200)}</span>
              <span className="font-semibold text-white">of {formatCurrency(25000)}</span>
            </div>
          </div>

          {/* Recent transactions */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-2">
              Recent Transactions
            </p>
            <div className="space-y-1">
              {TRANSACTIONS.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      t.income
                        ? 'bg-emerald-500/12 border-emerald-400/20 text-emerald-300'
                        : 'bg-white/[0.05] border-white/10 text-[#A6B3C3]'
                    }`}
                  >
                    <CategoryIcon name={t.icon} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white truncate">{t.name}</p>
                    <p className="text-[10.5px] text-[#718096] truncate">{t.note}</p>
                  </div>
                  <span
                    className={`text-[12.5px] font-bold tabular-nums ${
                      t.income ? 'text-emerald-300' : 'text-[#A6B3C3]'
                    }`}
                  >
                    {t.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
