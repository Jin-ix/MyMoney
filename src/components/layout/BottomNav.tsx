import { NavLink } from 'react-router-dom';
import { Home, ArrowUpDown, PieChart, BarChart3, MoreHorizontal } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] transition-colors"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-[64px] max-w-2xl mx-auto px-1">
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-1 transition-all ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center px-3 py-1 rounded-full transition-all ${
                    isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 scale-105' : ''
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span className="text-[10px] leading-none truncate max-w-full">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
