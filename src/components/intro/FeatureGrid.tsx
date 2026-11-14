import type { ReactNode } from 'react';
import {
  Receipt,
  PieChart,
  TrendingUp,
  Target,
  CalendarDays,
  Bot,
  ArrowUpRight,
} from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ArthaLogo } from '@/components/chat/ArthaLogo';
import { SpendingChartPreview } from './SpendingChartPreview';
import { formatCurrency } from '@/lib/utils';

/* ---------- Mini visual previews (illustrative only) ---------- */

function ExpenseEntryVisual() {
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex-1 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center px-2.5 text-[12px] font-bold text-white tabular-nums">
          ₹450
        </span>
        <span className="h-8 px-2.5 rounded-lg bg-orange-500/15 border border-orange-400/20 text-orange-300 text-[11px] font-bold flex items-center gap-1.5">
          <CategoryIcon name="UtensilsCrossed" size={12} />
          Food
        </span>
      </div>
      <div className="flex gap-1.5">
        {['Cash', 'UPI', 'Card'].map((m, i) => (
          <span
            key={m}
            className={`flex-1 h-7 rounded-md text-[10px] font-semibold flex items-center justify-center border ${
              i === 1
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.08] text-[#718096]'
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <div className="h-7 rounded-lg bg-emerald-500 text-[#04120c] text-[11px] font-extrabold flex items-center justify-center">
        Save Expense
      </div>
    </div>
  );
}

function BudgetBarsVisual() {
  const rows = [
    { label: 'Food', pct: 68, color: 'bg-emerald-400' },
    { label: 'Transport', pct: 42, color: 'bg-cyan-400' },
    { label: 'Shopping', pct: 81, color: 'bg-amber-400' },
  ];
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3.5 space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[10.5px] font-semibold mb-1">
            <span className="text-[#A6B3C3]">{r.label}</span>
            <span className="text-white tabular-nums">{r.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightsSparkVisual() {
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3.5">
      <SpendingChartPreview compact />
      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-300">
        <TrendingUp size={11} />
        Spending down 12% vs last month
      </div>
    </div>
  );
}

function GoalRingVisual() {
  const pct = 72;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3.5 flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="url(#goalGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
          />
          <defs>
            <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white">
          {pct}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-white truncate">Emergency Fund</p>
        <p className="text-[10.5px] text-[#718096] tabular-nums">
          {formatCurrency(180000)} of {formatCurrency(250000)}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
          <Target size={10} /> On track
        </p>
      </div>
    </div>
  );
}

function CalendarVisual() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const marked = new Set([2, 5, 9, 14, 18, 23]);
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3">
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {days.map((d, i) => (
          <span key={i} className="text-center text-[9px] font-bold text-[#718096]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }, (_, i) => {
          const day = i + 1;
          const active = marked.has(day);
          return (
            <span
              key={day}
              className={`h-6 rounded-md text-[9.5px] font-semibold flex items-center justify-center tabular-nums ${
                active
                  ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                  : 'text-[#A6B3C3]'
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-[#A6B3C3]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Rent ₹12,000 due on the 1st
      </div>
    </div>
  );
}

function ArthaChatVisual() {
  return (
    <div className="rounded-xl bg-[#08101c] border border-white/[0.07] p-3 space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-emerald-500/15 border border-emerald-400/20 px-2.5 py-1.5 text-[10.5px] text-white">
          Food spend this month?
        </div>
      </div>
      <div className="flex items-start gap-1.5">
        <ArthaLogo size={16} className="shrink-0 mt-0.5" />
        <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-white/[0.05] border border-white/10 px-2.5 py-1.5 text-[10.5px] text-[#A6B3C3] leading-snug">
          <span className="text-emerald-300 font-bold">₹4,250</span> — within your food budget.
        </div>
      </div>
    </div>
  );
}

/* ---------- Feature grid ---------- */

interface Feature {
  icon: typeof Receipt;
  title: string;
  desc: string;
  accent: string;
  iconChip: string;
  visual: ReactNode;
}

const FEATURES: Feature[] = [
  {
    icon: Receipt,
    title: 'Effortless Expense Tracking',
    desc: 'Record income and expenses in seconds. Organize every transaction and understand where your money goes.',
    accent: 'hover:border-emerald-400/30',
    iconChip: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',
    visual: <ExpenseEntryVisual />,
  },
  {
    icon: PieChart,
    title: 'Intelligent Budgets',
    desc: 'Set monthly limits, monitor category spending, and stay ahead of your financial goals.',
    accent: 'hover:border-cyan-400/30',
    iconChip: 'bg-cyan-400/10 border-cyan-400/25 text-cyan-300',
    visual: <BudgetBarsVisual />,
  },
  {
    icon: TrendingUp,
    title: 'Financial Insights',
    desc: 'Turn your daily financial activity into meaningful reports and clear spending insights.',
    accent: 'hover:border-emerald-400/30',
    iconChip: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',
    visual: <InsightsSparkVisual />,
  },
  {
    icon: Target,
    title: 'Savings Goals',
    desc: 'Create meaningful savings targets and track your progress as you move closer to them.',
    accent: 'hover:border-cyan-400/30',
    iconChip: 'bg-cyan-400/10 border-cyan-400/25 text-cyan-300',
    visual: <GoalRingVisual />,
  },
  {
    icon: CalendarDays,
    title: 'Financial Calendar',
    desc: 'Understand your financial activity through dates, recurring payments, and upcoming expenses.',
    accent: 'hover:border-emerald-400/30',
    iconChip: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',
    visual: <CalendarVisual />,
  },
  {
    icon: Bot,
    title: 'Artha AI',
    desc: 'Explore your financial activity through a conversational assistant that helps you understand your money.',
    accent: 'hover:border-cyan-400/30',
    iconChip: 'bg-cyan-400/10 border-cyan-400/25 text-cyan-300',
    visual: <ArthaChatVisual />,
  },
];

export function FeatureGrid() {
  return (
    <section aria-labelledby="intro-features-heading" className="relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="intro-rise max-w-2xl mx-auto text-center mb-12 lg:mb-14">
          <p className="text-[11px] font-bold tracking-[0.24em] uppercase text-emerald-300/90 mb-3">
            Everything in one place
          </p>
          <h2
            id="intro-features-heading"
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] text-white leading-tight"
          >
            Built for clarity at <span className="intro-gradient-text">every level</span>
          </h2>
          <p className="mt-4 text-[15px] text-[#A6B3C3] leading-relaxed">
            From logging your first expense to planning your financial future — one calm,
            intelligent workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={140 + i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  const { icon: Icon, title, desc, accent, iconChip, visual } = feature;
  return (
    <article
      className={`intro-rise intro-card group rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:bg-[#13202F] hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] border-white/[0.09] ${accent} border`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${iconChip}`}
        >
          <Icon size={19} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-extrabold text-white tracking-tight flex items-center gap-1.5">
            {title}
            <ArrowUpRight
              size={13}
              className="text-[#718096] opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-emerald-300"
            />
          </h3>
          <p className="mt-1 text-[13px] text-[#A6B3C3] leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="mt-auto">{visual}</div>
    </article>
  );
}
