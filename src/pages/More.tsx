import { Link } from 'react-router-dom';
import {
  Target,
  Repeat,
  Wallet,
  Settings,
  Download,
  CheckCircle2,
  Bot,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const MORE_ITEMS = [
  {
    to: '/savings-goals',
    label: 'Savings Goals',
    description: 'Track capital targets & milestones',
    icon: Target,
    color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  },
  {
    to: '/recurring-payments',
    label: 'Recurring Payments',
    description: 'Subscriptions, bills & automated commitments',
    icon: Repeat,
    color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
  },
  {
    to: '/accounts',
    label: 'Accounts & Portfolios',
    description: 'Depository assets, cards & cash ledgers',
    icon: Wallet,
    color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
  },
  {
    to: '/settings',
    label: 'Settings & Cloud Sync',
    description: 'Currency, preferences & PostgreSQL backup',
    icon: Settings,
    color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  },
];

export default function More() {
  const { isInstallable, isInstalled, install } = useInstallPrompt();

  return (
    <div className="space-y-4 sm:space-y-6 animate-page-enter">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Wealth Hub &amp; Navigation
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Dedicated modules for long-term planning, automated cashflow, and system configurations
        </p>
      </div>

      {/* Artha AI Feature Banner */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
        className="w-full text-left p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg shadow-emerald-950/20 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:shadow-xl transition-all active:scale-[0.99] border border-emerald-400/20"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-emerald-200 shrink-0">
            <Bot size={22} className="sm:hidden" />
            <Bot size={26} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white truncate">Artha AI Financial Advisor</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-300 border border-emerald-400/30 flex items-center gap-1 shrink-0">
                <Sparkles size={10} /> Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-none">
              Ask about your budget limits, query top expenses, or log transactions naturally in plain English
            </p>
          </div>
        </div>
        <div className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white items-center gap-1.5 transition-colors shrink-0">
          <span>Open Chat</span>
          <ChevronRight size={14} />
        </div>
      </button>

      {/* Grid of Navigation Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        {MORE_ITEMS.map(({ to, label, description, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="fintech-card fintech-card-interactive p-3.5 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 group min-h-[58px]"
          >
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-xs`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {label}
                </span>
                <span className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 block mt-0.5 truncate">
                  {description}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        ))}
      </div>

      {/* PWA Install Promotion */}
      {isInstallable && (
        <div className="fintech-card p-4 sm:p-5 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200 truncate">
                Install MyMoney on your device
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                Enjoy offline-first speeds, standalone window, and instant home screen launching.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => install()}
            className="w-full sm:w-auto min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Download size={15} />
            <span>Install Now</span>
          </button>
        </div>
      )}

      {isInstalled && (
        <div className="fintech-card p-4 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 size={16} />
          <span>MyMoney is running as an installed Progressive Web App (PWA)</span>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 dark:text-slate-500 pt-4">
        MyMoney Personal Wealth Intelligence • Version 2.0.0
      </p>
    </div>
  );
}
