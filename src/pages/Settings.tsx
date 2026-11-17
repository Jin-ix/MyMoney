import { useState } from 'react';
import {
  Download,
  Trash2,
  Cloud,
  CircleDollarSign,
  Check,
  Sparkles,
  LogOut,
  LogIn,
  User as UserIcon,
  Bot,
  Key,
  ExternalLink,
  ShieldCheck,
  Moon,
  Sun,
  Globe,
  Bell,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getSupabaseConfig } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '@/services/aiService';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) – Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) – US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) – Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) – British Pound' },
];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const clearAllData = useStore((s) => s.clearAllData);
  const syncPending = useStore((s) => s.syncPending);
  const syncOfflineQueue = useStore((s) => s.syncOfflineQueue);
  const showToast = useStore((s) => s.showToast);
  const replayIntro = useStore((s) => s.replayIntro);
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const accounts = useStore((s) => s.accounts);
  const savingsGoals = useStore((s) => s.savingsGoals);
  const recurringPayments = useStore((s) => s.recurringPayments);

  const [confirmClear, setConfirmClear] = useState(false);
  const [exported, setExported] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => getStoredGeminiApiKey());
  const [keySaved, setKeySaved] = useState(false);

  const supabaseConfig = getSupabaseConfig();
  const todayStr = new Date().toISOString().slice(0, 10);

  const handleToggleNotifications = async () => {
    const next = !settings.notifications;
    if (next && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore if blocked in browser context
      }
    }
    updateSettings({ notifications: next });
    showToast(next ? 'Notifications enabled' : 'Notifications muted');
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      accounts,
      transactions,
      budgets,
      savingsGoals,
      recurringPayments,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mymoney-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    showToast('Backup JSON exported successfully');
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-page-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Workspace localization, theme customization, PostgreSQL sync, and Artha AI configuration
        </p>
      </div>

      {/* Cloud & Supabase PostgreSQL Authentication */}
      <section className="fintech-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                Cloud Sync &amp; Database
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                Supabase PostgreSQL with Row-Level Security
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto shrink-0 ${
              user
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
            }`}
          >
            <ShieldCheck size={13} />
            {user ? 'Encrypted & Synced' : 'Local Sandbox Mode'}
          </span>
        </div>

        {user ? (
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <UserIcon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {user.email}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono truncate">
                  UID: {user.id.slice(0, 8)}...{user.id.slice(-6)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="min-h-[38px] px-4 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Connect your account for multi-device sync
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Keep all your transactions, budgets and accounts safely backed up in PostgreSQL with instant restore.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <LogIn size={14} />
              <span>Connect / Sign In</span>
            </button>
          </div>
        )}

        {syncPending > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {syncPending} changes waiting to sync to cloud
            </span>
            <button
              type="button"
              onClick={() => syncOfflineQueue()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Sync Now</span>
            </button>
          </div>
        )}
      </section>

      {/* Artha AI Configuration */}
      <section className="fintech-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                Artha AI Wealth Intelligence
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                Context-aware conversational advisor &amp; natural language transaction logger
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto shrink-0 ${
              geminiKey
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400'
            }`}
          >
            <Sparkles size={12} />
            {geminiKey ? 'Gemini 1.5 Flash Connected' : 'Local Deterministic AI'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
            Google Gemini API Key (Optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                setKeySaved(false);
              }}
              placeholder="Paste AIzaSy... key from Google AI Studio"
              className="flex-1 min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStoredGeminiApiKey(geminiKey);
                  setKeySaved(true);
                  showToast(geminiKey.trim() ? '✓ Gemini API Key saved!' : 'Gemini Key cleared (using Local AI)');
                }}
                className="min-h-[46px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {keySaved ? <Check size={16} /> : <Key size={14} />}
                <span>{keySaved ? 'Saved' : 'Save Key'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
                className="min-h-[46px] px-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Bot size={15} />
                <span>Launch Artha</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1">
            <span>Artha works 100% offline with zero setup. Adding a free API key unlocks unbounded financial reasoning.</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline shrink-0 ml-2"
            >
              <span>Get Free Key</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* General & Localization */}
      <section className="fintech-card p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Localization & Currency
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-currency" className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Operating Currency
            </label>
            <Select
              id="set-currency"
              value={settings.currency}
              onChange={(val) => {
                const found = CURRENCIES.find((c) => c.code === val);
                if (found) {
                  updateSettings({ currency: found.code, currencySymbol: found.symbol });
                  showToast(`Currency set to ${found.code} (${found.symbol})`);
                }
              }}
              options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
            />
          </div>

          <div>
            <label htmlFor="set-datefmt" className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Date Format
            </label>
            <Select
              id="set-datefmt"
              value={settings.dateFormat}
              onChange={(val) => {
                updateSettings({ dateFormat: val });
                showToast(`Date format updated (${formatDate(todayStr, val)})`);
              }}
              options={[
                { value: 'dd/MM/yyyy', label: `DD/MM/YYYY (${formatDate(todayStr, 'dd/MM/yyyy')})` },
                { value: 'MM/dd/yyyy', label: `MM/DD/YYYY (${formatDate(todayStr, 'MM/dd/yyyy')})` },
                { value: 'yyyy-MM-dd', label: `YYYY-MM-DD (${formatDate(todayStr, 'yyyy-MM-dd')})` },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Appearance & Preferences */}
      <section className="fintech-card p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Appearance &amp; Notifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-theme" className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Interface Color Theme
            </label>
            <Select
              id="set-theme"
              value={settings.theme}
              onChange={(val) => {
                const theme = val as 'light' | 'dark' | 'system';
                updateSettings({ theme });
                showToast(`Theme switched to ${theme}`);
              }}
              options={[
                { value: 'light', label: 'Light Mode (Clean Ivory)' },
                { value: 'dark', label: 'Dark Mode (Fintech Slate)' },
                { value: 'system', label: 'System Automatic' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="set-week" className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Calendar Start of Week
            </label>
            <Select
              id="set-week"
              value={settings.startOfWeek}
              onChange={(val) => {
                const startOfWeek = val as 'monday' | 'sunday';
                updateSettings({ startOfWeek });
                showToast(`Calendar week starts on ${startOfWeek}`);
              }}
              options={[
                { value: 'monday', label: 'Monday (ISO 8601 Standard)' },
                { value: 'sunday', label: 'Sunday' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 min-h-[44px]">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Push &amp; In-App Notifications</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Budget thresholds, bill reminders, and safe-to-spend alerts</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifications}
            aria-label="Toggle notifications"
            onClick={handleToggleNotifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.notifications ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Data Management & Backup */}
      <section className="fintech-card p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Data Export &amp; Maintenance
        </h2>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            {exported ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Download size={16} />}
            <span>{exported ? 'Exported JSON Backup' : 'Export Full JSON Backup'}</span>
          </button>

          <button
            type="button"
            onClick={replayIntro}
            className="min-h-[44px] px-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles size={16} />
            <span>Replay Welcome Tour</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] px-4 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 size={16} />
              <span>Reset All Records</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearAllData();
                  setConfirmClear(false);
                  showToast('All local data wiped');
                }}
                className="min-h-[44px] px-4 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Complete Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Product Meta */}
      <div className="fintech-card p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs">
            <CircleDollarSign size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">MyMoney Personal Wealth Intelligence</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Release v2.0.0 • Production PWA • Supabase PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
