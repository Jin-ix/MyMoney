import { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  WifiOff,
  Download,
  X,
  RefreshCw,
  CircleDollarSign,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
  Cloud,
  User as UserIcon,
  Bot,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import QuickAddTransaction from '@/components/mobile/QuickAddTransaction';
import { AiChatbot } from '@/components/chat/AiChatbot';
import { IntroPage } from '@/components/intro/IntroPage';
import { AuthModal } from '@/components/auth/AuthModal';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useStore } from '@/store/useStore';
import { isInMonth, formatDate } from '@/lib/utils';
import { getCategoryById } from '@/lib/categories';

export function AppLayout() {
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const { isInstallable, install } = useInstallPrompt();
  const [installDismissed, setInstallDismissed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const syncPending = useStore((s) => s.syncPending);
  const syncState = useStore((s) => s.syncState);
  const syncOfflineQueue = useStore((s) => s.syncOfflineQueue);

  const toastMessage = useStore((s) => s.toastMessage);
  const hasSeenIntro = useStore((s) => s.hasSeenIntro);
  const replayIntro = useStore((s) => s.replayIntro);
  const settings = useStore((s) => s.settings);
  const user = useStore((s) => s.user);
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen);
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const currentMonth = useStore((s) => s.currentMonth);
  const recurringPayments = useStore((s) => s.recurringPayments);

  // Live clock in top bar
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockText = format(now, 'hh:mm:ss a');
  const todayFormatted = formatDate(format(now, 'yyyy-MM-dd'), settings.dateFormat);

  // Apply theme (light / dark / system) dynamically
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    if (settings.theme === 'system') {
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (isOnline && syncPending > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, syncPending, syncOfflineQueue]);

  // Smart notifications driven by settings.notifications
  const alerts = useMemo(() => {
    if (!settings.notifications) return [];
    const list: Array<{ id: string; title: string; detail: string; tone: 'warn' | 'info' }> = [];

    const monthExpenses = transactions.filter(
      (t) => t.type === 'expense' && isInMonth(t.date, currentMonth)
    );
    budgets
      .filter((b) => b.month === currentMonth)
      .forEach((b) => {
        const spent = monthExpenses
          .filter((t) => t.category === b.category)
          .reduce((sum, t) => sum + t.amount, 0);
        const pct = b.allocated > 0 ? Math.round((spent / b.allocated) * 100) : 0;
        const catName = getCategoryById(b.category)?.name ?? b.category;
        if (pct >= 100) {
          list.push({
            id: `b-${b.id}`,
            title: `${catName} budget exceeded`,
            detail: `You have reached ${pct}% of your ${catName} budget.`,
            tone: 'warn',
          });
        } else if (pct >= 80) {
          list.push({
            id: `b-${b.id}`,
            title: `${catName} budget at ${pct}%`,
            detail: `Approaching your monthly limit for ${catName}.`,
            tone: 'warn',
          });
        }
      });

    recurringPayments
      .filter((p) => p.isActive)
      .slice(0, 3)
      .forEach((p) => {
        list.push({
          id: `rp-${p.id}`,
          title: `Upcoming: ${p.name}`,
          detail: `Scheduled for ${p.nextDate} (${p.frequency})`,
          tone: 'info',
        });
      });

    return list;
  }, [settings.notifications, budgets, transactions, currentMonth, recurringPayments]);

  const pageMeta = useMemo(() => {
    switch (location.pathname) {
      case '/':
        return { title: 'Dashboard', desc: 'Wealth overview & cashflow' };
      case '/transactions':
        return { title: 'Transactions', desc: 'Ledger & payment records' };
      case '/budgets':
        return { title: 'Budgets', desc: 'Category allocations & limits' };
      case '/reports':
        return { title: 'Reports & Analytics', desc: 'Cashflow trends & distribution' };
      case '/accounts':
        return { title: 'Accounts & Wallets', desc: 'Liquid assets & credit cards' };
      case '/savings-goals':
        return { title: 'Savings Goals', desc: 'Milestones & deadline targets' };
      case '/recurring-payments':
        return { title: 'Recurring Payments', desc: 'Bills & active subscriptions' };
      case '/settings':
        return { title: 'Settings', desc: 'Preferences, sync & AI config' };
      case '/more':
        return { title: 'More', desc: 'Management & utilities' };
      default:
        return { title: 'MyMoney', desc: 'Personal Wealth Intelligence' };
    }
  }, [location.pathname]);

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Stunning Intro Screen on First Visit or Replay */}
      {!hasSeenIntro && <IntroPage />}

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Responsive Top Header */}
        <header
          className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2 sm:gap-3 transition-colors"
          style={{ paddingTop: 'max(0.625rem, var(--safe-area-inset-top))' }}
        >
          {/* Left: Mobile Brand or Desktop Page Context */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-sm shadow-emerald-600/25 shrink-0">
              <CircleDollarSign size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {pageMeta.title}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate leading-none mt-0.5">
                {pageMeta.desc}
              </p>
            </div>
          </div>

          {/* Center: Command Palette Quick Search Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            title="Open Command Palette (Ctrl+K or ⌘K)"
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <Search size={14} className="text-slate-400" />
            <span className="font-medium">Command palette</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/80 text-[10px] font-mono text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
              ⌘K
            </kbd>
          </button>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Clock Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-xs font-bold tabular-nums">
              <Clock size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{clockText}</span>
            </div>

            {/* Artha AI Header Button */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
              title="Open Artha AI Assistant"
              className="h-8.5 px-3 rounded-full border border-teal-300/80 dark:border-teal-700/60 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 hover:from-teal-100 hover:to-emerald-100 dark:hover:from-teal-900/50 dark:hover:to-emerald-900/50 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Bot size={14} className="text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Artha AI</span>
              <Sparkles size={11} className="text-amber-500 shrink-0" />
            </button>

            {/* Cloud Sync State */}
            {user ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                title={`Signed in as ${user.email}`}
                className="h-8.5 px-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="max-w-[80px] truncate hidden md:inline">
                  {user.email?.split('@')[0]}
                </span>
                <UserIcon size={14} className="md:hidden" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="h-8.5 px-3 rounded-full border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100/80 transition-all cursor-pointer shadow-2xs"
              >
                <Cloud size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Notifications Bell */}
            {settings.notifications && (
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                className="relative w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <Bell size={17} />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            )}

          </div>
        </header>

        {/* Notifications Dropdown */}
        {notifOpen && settings.notifications && (
          <div className="fixed top-14 right-4 z-40 w-72 sm:w-80 fintech-card p-3.5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Alerts &amp; Reminders
              </span>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close notifications"
              >
                <X size={14} />
              </button>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-2.5 rounded-xl text-xs border ${
                      a.tone === 'warn'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="font-bold">{a.title}</p>
                    <p className="opacity-80 mt-0.5">{a.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-3 text-center">
                All clear! No budget alerts or reminders right now.
              </p>
            )}
          </div>
        )}

        {/* Offline Banner */}
        {!isOnline && (
          <div
            className="bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 shadow-sm"
            role="status"
          >
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff size={16} className="shrink-0" />
              <span className="truncate">
                You are offline. Changes are saved locally and will sync when reconnected.
              </span>
            </div>
            {syncPending > 0 && (
              <span className="shrink-0 bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                {syncPending} pending
              </span>
            )}
          </div>
        )}

        {/* Pending Sync Indicator when online */}
        {isOnline && syncPending > 0 && (
          <div
            className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-2"
            role="status"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              <span>
                {syncState === 'syncing'
                  ? 'Syncing offline transactions...'
                  : `${syncPending} unsynchronized transaction${syncPending > 1 ? 's' : ''}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => syncOfflineQueue()}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold min-h-[32px]"
            >
              Sync now
            </button>
          </div>
        )}

        {/* PWA Install Prompt Banner */}
        {isInstallable && !installDismissed && (
          <div className="bg-emerald-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-emerald-200/80 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  Install MyMoney App
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate hidden sm:block">
                  Add to your home screen for quick offline access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => install()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold min-h-[34px] transition-all cursor-pointer shadow-xs"
              >
                Install
              </button>
              <button
                type="button"
                onClick={() => setInstallDismissed(true)}
                aria-label="Dismiss install prompt"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[34px] min-w-[34px] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="fixed top-16 lg:top-6 left-1/2 z-50 animate-toast-in bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Content with smooth route transition */}
        <main
          className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-4 lg:py-8"
          style={{
            paddingBottom: 'calc(var(--bottom-nav-height) + 84px + var(--safe-area-inset-bottom))',
          }}
        >
          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Quick Add Transaction FAB & Sheet */}
      <QuickAddTransaction />

      {/* MoneyBot AI Financial Assistant Chatbot */}
      <AiChatbot />

      {/* Supabase Authentication Modal */}
      <AuthModal />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
