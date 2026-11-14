import { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parse,
} from 'date-fns';
import { Clock, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatDate } from '@/lib/utils';

export function CalendarClockWidget() {
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const currentMonth = useStore((s) => s.currentMonth);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const openQuickAdd = useStore((s) => s.openQuickAdd);

  // Live clock tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const weekStartsOn = settings.startOfWeek === 'sunday' ? 0 : 1;

  const weekdayHeaders = useMemo(() => {
    return weekStartsOn === 0
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [weekStartsOn]);

  const monthDate = useMemo(
    () => parse(currentMonth, 'yyyy-MM', new Date()),
    [currentMonth]
  );

  const calendarDays = useMemo(() => {
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(mStart, { weekStartsOn });
    const gridEnd = endOfWeek(mEnd, { weekStartsOn });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthDate, weekStartsOn]);

  const dayActivityMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach((tx) => {
      const entry = map.get(tx.date) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(tx.date, entry);
    });
    return map;
  }, [transactions]);

  const selectedKey = format(selectedDay, 'yyyy-MM-dd');
  const selectedStats = dayActivityMap.get(selectedKey) ?? { income: 0, expense: 0 };

  return (
    <div className="fintech-card p-4 sm:p-5 space-y-4">
      {/* Live Clock & Today Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black tabular-nums text-gray-900 dark:text-white leading-tight">
              {format(now, 'hh:mm:ss a')}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-0.5">
              {format(now, 'EEEE')} • {formatDate(format(now, 'yyyy-MM-dd'), settings.dateFormat)}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold shadow-xs">
          <CalendarIcon size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>{format(monthDate, 'MMMM yyyy')}</span>
        </span>
      </div>

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {weekdayHeaders.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inCurrentMonth = isSameMonth(day, monthDate);
            const isToday = isSameDay(day, now);
            const isSelected = isSameDay(day, selectedDay);
            const activity = dayActivityMap.get(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative flex flex-col items-center justify-center min-h-[40px] sm:min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/35 ring-2 ring-emerald-400/50 scale-105'
                    : isToday
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/50'
                    : inCurrentMonth
                    ? 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                    : 'text-gray-300 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <span className="tabular-nums">{format(day, 'd')}</span>
                {(activity?.income || activity?.expense) ? (
                  <span className="flex items-center gap-0.5 mt-0.5">
                    {activity.income > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-emerald-200' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                    {activity.expense > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-red-200' : 'bg-red-500'
                        }`}
                      />
                    )}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Summary + Quick Log */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
        <div className="text-xs">
          <p className="font-extrabold text-gray-900 dark:text-white">
            {formatDate(selectedKey, settings.dateFormat)}
          </p>
          <p className="text-gray-500 dark:text-slate-400 font-medium mt-0.5">
            {selectedStats.income > 0 || selectedStats.expense > 0 ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  +{formatCurrency(selectedStats.income, settings.currencySymbol)}
                </span>{' '}
                •{' '}
                <span className="text-red-500 dark:text-red-400 font-bold">
                  -{formatCurrency(selectedStats.expense, settings.currencySymbol)}
                </span>
              </>
            ) : (
              'No transactions recorded on this date'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickAdd('expense', selectedKey)}
          className="min-h-[38px] px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800/40 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Log for day</span>
        </button>
      </div>
    </div>
  );
}
