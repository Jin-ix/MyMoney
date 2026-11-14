import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  ArrowUpDown,
  PieChart,
  BarChart3,
  Target,
  Repeat,
  Wallet,
  Settings,
  CircleDollarSign,
  Cloud,
  Bot,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';

const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
];

const WEALTH_NAV = [
  { to: '/savings-goals', label: 'Savings Goals', icon: Target },
  { to: '/recurring-payments', label: 'Recurring Payments', icon: Repeat },
];

const SYSTEM_NAV = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const user = useStore((s) => s.user);
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen);
  const syncState = useStore((s) => s.syncState);

  const netBalance = useMemo(() => {
    if (accounts.length > 0) {
      // Calculate Assets minus Liabilities (credit cards)
      return accounts.reduce((sum, a) => (a.type === 'credit' ? sum - a.balance : sum + a.balance), 0);
    }
    return transactions.reduce(
      (sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount),
      0
    );
  }, [accounts, transactions]);

  const renderNavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[42px] cursor-pointer ${
          isActive
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/30'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            className={`shrink-0 transition-transform duration-200 ${
              isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
            }`}
          />
          {!isCollapsed && <span className="ml-3 truncate">{label}</span>}
          {isActive && (
            <span
              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 z-30 bg-slate-950 text-white border-r border-slate-800/80 transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} py-4 border-b border-slate-800/80`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
            <CircleDollarSign size={20} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-white block leading-none truncate">
                MyMoney
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-emerald-400 uppercase mt-0.5 block truncate">
                Wealth Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse Sidebar"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand Button when Collapsed */}
      {isCollapsed && (
        <div className="px-3 py-2 border-b border-slate-800/80 flex justify-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-hide" aria-label="Main navigation">
        {/* 1. PRIMARY */}
        <div>
          {!isCollapsed && (
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Primary
            </p>
          )}
          <div className="space-y-1">{PRIMARY_NAV.map(renderNavLink)}</div>
        </div>

        {/* 2. WEALTH */}
        <div>
          {!isCollapsed && (
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Wealth
            </p>
          )}
          <div className="space-y-1">{WEALTH_NAV.map(renderNavLink)}</div>
        </div>

        {/* 3. ASSISTANT */}
        <div>
          {!isCollapsed && (
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Assistant
            </p>
          )}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            title={isCollapsed ? 'Artha AI Assistant' : undefined}
            className={`w-full group relative flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'px-3.5'
            } py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[42px] bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/20 hover:border-emerald-500/40 shadow-xs cursor-pointer active:scale-[0.98]`}
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
              <Bot size={15} />
            </div>
            {!isCollapsed && (
              <>
                <span className="ml-3 truncate flex-1 text-left">Artha AI</span>
                <Sparkles size={13} className="text-amber-400 shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* 4. SYSTEM */}
        <div>
          {!isCollapsed && (
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              System
            </p>
          )}
          <div className="space-y-1">{SYSTEM_NAV.map(renderNavLink)}</div>
        </div>
      </nav>

      {/* Footer: Balance Glance & Cloud Status */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {!isCollapsed ? (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Net Balance</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-base font-extrabold text-white tabular-nums mt-0.5 truncate">
              {netBalance < 0 ? '-' : ''}
              {formatCurrency(netBalance, symbol)}
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-2 rounded-xl bg-slate-900 border border-slate-800" title={`Net Balance: ${formatCurrency(netBalance, symbol)}`}>
            <Zap size={16} className="text-emerald-400" />
          </div>
        )}

        {/* Supabase Connection State */}
        {user ? (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            title={`Connected to Supabase as ${user.email}`}
            className={`w-full py-2 ${isCollapsed ? 'px-1 justify-center' : 'px-3 justify-between'} rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-[11px] flex items-center text-slate-300 transition-colors cursor-pointer`}
          >
            {!isCollapsed && (
              <span className="truncate max-w-[150px] font-medium text-emerald-400">
                {user.email?.split('@')[0]}
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            title="Connect Supabase Cloud Database"
            className={`w-full py-2 ${isCollapsed ? 'px-1 justify-center' : 'px-3 justify-center'} rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
          >
            <Cloud size={13} />
            {!isCollapsed && <span>Connect Cloud</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
