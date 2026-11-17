import { useState, useMemo } from 'react';
import {
  Plus,
  Target,
  Trash2,
  PiggyBank,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInMonths, isPast, isToday } from 'date-fns';
import { useStore } from '@/store/useStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDate, clampPercentage } from '@/lib/utils';
import type { SavingsGoal } from '@/types';

const GOAL_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#10b981', // Mint
  '#475569', // Slate
];

export default function SavingsGoals() {
  const savingsGoals = useStore((s) => s.savingsGoals);
  const addSavingsGoal = useStore((s) => s.addSavingsGoal);
  const updateSavingsGoal = useStore((s) => s.updateSavingsGoal);
  const deleteSavingsGoal = useStore((s) => s.deleteSavingsGoal);
  const showToast = useStore((s) => s.showToast);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const dateFormat = useStore((s) => s.settings.dateFormat);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [error, setError] = useState('');

  // Quick deposit sheet state
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    const completedCount = savingsGoals.filter((g) => g.currentAmount >= g.targetAmount).length;

    return { totalTarget, totalSaved, overallPct, completedCount };
  }, [savingsGoals]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline(format(new Date(), 'yyyy-MM-dd'));
    setColor(GOAL_COLORS[0]);
    setError('');
    setIsOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setDeadline(goal.deadline);
    setColor(goal.color);
    setError('');
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount || '0');
    if (!name.trim()) {
      setError('Please provide a goal name');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('Target amount must be greater than 0');
      return;
    }

    const payload = {
      name: name.trim(),
      targetAmount: target,
      currentAmount: isNaN(current) ? 0 : current,
      deadline,
      color,
      icon: 'Target',
    };

    if (editing) {
      updateSavingsGoal(editing.id, payload);
      showToast(`Updated ${name.trim()}`);
    } else {
      addSavingsGoal(payload);
      showToast(`Created ${name.trim()}`);
    }
    setIsOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const added = parseFloat(depositAmount);
    if (isNaN(added) || added <= 0) return;

    const newAmount = depositGoal.currentAmount + added;
    updateSavingsGoal(depositGoal.id, { currentAmount: newAmount });

    if (newAmount >= depositGoal.targetAmount) {
      showToast(`🎉 Milestone reached! ${depositGoal.name} is fully funded!`);
    } else {
      showToast(`Added ${formatCurrency(added, symbol)} to ${depositGoal.name}`);
    }
    setDepositGoal(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Savings Goals & Milestones
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Long-term capital accumulation, emergency funds, and major milestone funding
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Accumulated</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PiggyBank size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-tabular truncate">
            {formatCurrency(metrics.totalSaved, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Across all targets
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Target Horizon</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Target size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular truncate">
            {formatCurrency(metrics.totalTarget, symbol)}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Cumulative goal capital
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Progress</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 font-tabular">
            {metrics.overallPct}%
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Weighted portfolio funding
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-tabular">
            {metrics.completedCount}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400 ml-1.5">
              of {savingsGoals.length}
            </span>
          </p>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">
            Fully achieved milestones
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsGoals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
                : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            // Calculate recommended monthly deposit pace
            let monthsLeft = 1;
            let daysLeft = 0;
            let isPastDeadline = false;
            try {
              const d = parseISO(goal.deadline);
              isPastDeadline = isPast(d) && !isToday(d);
              daysLeft = differenceInDays(d, new Date());
              monthsLeft = Math.max(1, differenceInMonths(d, new Date()));
            } catch {
              // fallback
            }

            const monthlyPace = remaining > 0 && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : 0;

            return (
              <div
                key={goal.id}
                className="fintech-card fintech-card-interactive p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      onClick={() => openEdit(goal)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openEdit(goal);
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: goal.color }}
                      >
                        <CategoryIcon name={goal.icon} size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {goal.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Target: {formatDate(goal.deadline, dateFormat)}
                          {isPastDeadline && !isCompleted && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1">
                              (Past Target Date)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : pct >= 50
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden my-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${clampPercentage(pct)}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  {/* Saved vs Target numbers */}
                  <div className="flex items-baseline justify-between text-xs font-tabular mb-1">
                    <span className="text-gray-500 dark:text-slate-400">
                      Saved:{' '}
                      <strong className="text-gray-900 dark:text-white font-bold text-sm">
                        {formatCurrency(goal.currentAmount, symbol)}
                      </strong>
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Target: {formatCurrency(goal.targetAmount, symbol)}
                    </span>
                  </div>

                  {/* Monthly Pace Insight */}
                  {!isCompleted && remaining > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-[11px] text-gray-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Pace to reach on time:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-tabular">
                        {formatCurrency(monthlyPace, symbol)}/month
                      </strong>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3.5 mt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-tabular">
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 size={13} /> Fully Achieved
                      </span>
                    ) : (
                      `${formatCurrency(remaining, symbol)} to go`
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDepositGoal(goal);
                        setDepositAmount('');
                      }}
                      className="min-h-[34px] px-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PiggyBank size={14} />
                      <span>+ Deposit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fintech-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Target size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No savings goals created yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Whether saving for an emergency fund, travel, investment deposit, or down payment, goals turn intentions into funded milestones.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Create First Goal</span>
          </button>
        </div>
      )}

      {/* Create / Edit Goal BottomSheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Edit Savings Milestone' : 'New Savings Goal'}
      >
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          <div>
            <label
              htmlFor="goal-name"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              placeholder="e.g. 6-Month Emergency Cushion, Europe Trip"
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
                htmlFor="goal-target"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Target Amount ({symbol})
              </label>
              <input
                id="goal-target"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="goal-current"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Already Saved ({symbol})
              </label>
              <input
                id="goal-current"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="goal-deadline"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Target Completion Date
            </label>
            <input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Milestone Badge Color
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${
                    color === c ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

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
                  deleteSavingsGoal(editing.id);
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
              {editing ? 'Save Changes' : 'Confirm Goal'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Quick Deposit Modal */}
      <BottomSheet
        isOpen={!!depositGoal}
        onClose={() => setDepositGoal(null)}
        title={`Add Deposit • ${depositGoal?.name || ''}`}
      >
        {depositGoal && (
          <form onSubmit={handleDepositSubmit} className="space-y-4 pb-2">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
              <span className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                Current Progress
              </span>
              <p className="text-xl font-bold font-tabular text-gray-900 dark:text-white">
                {formatCurrency(depositGoal.currentAmount, symbol)}{' '}
                <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                  of {formatCurrency(depositGoal.targetAmount, symbol)}
                </span>
              </p>
            </div>

            <div>
              <label
                htmlFor="deposit-amount"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Deposit Amount ({symbol})
              </label>
              <input
                id="deposit-amount"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-2xl font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />

              {/* Quick Deposit Chips */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[500, 1000, 2500, 5000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDepositAmount(String(chip))}
                    className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-slate-300 hover:text-emerald-600 font-tabular transition-colors cursor-pointer"
                  >
                    +{formatCurrency(chip, symbol)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PiggyBank size={18} />
                <span>Confirm Deposit</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
