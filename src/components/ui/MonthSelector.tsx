import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthLabel, getPreviousMonth, getNextMonth } from '@/lib/utils';

interface MonthSelectorProps {
  currentMonth: string;
  onChange: (month: string) => void;
}

export function MonthSelector({ currentMonth, onChange }: MonthSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-xl px-1.5 py-1 shadow-xs">
      <button
        type="button"
        onClick={() => onChange(getPreviousMonth(currentMonth))}
        aria-label="Previous month"
        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="px-2 text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-center select-none">
        {getMonthLabel(currentMonth)}
      </span>
      <button
        type="button"
        onClick={() => onChange(getNextMonth(currentMonth))}
        aria-label="Next month"
        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

