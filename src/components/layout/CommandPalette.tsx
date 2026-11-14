import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowUpDown,
  Home,
  BarChart3,
  PieChart,
  Wallet,
  Target,
  Repeat,
  Bot,
  Settings,
  Moon,
  Sun,
  X,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Actions' | 'Navigation' | 'Preferences';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const openQuickAdd = useStore((s) => s.openQuickAdd);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenCustom = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCustom);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCustom);
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const commands = useMemo<CommandItem[]>(() => [
    {
      id: 'add-expense',
      title: 'Log New Expense',
      subtitle: 'Record an outflow with category and account',
      category: 'Actions',
      icon: Plus,
      shortcut: 'N',
      action: () => {
        setIsOpen(false);
        openQuickAdd('expense');
      },
    },
    {
      id: 'add-income',
      title: 'Add New Income',
      subtitle: 'Credit funds to an account',
      category: 'Actions',
      icon: Plus,
      action: () => {
        setIsOpen(false);
        openQuickAdd('income');
      },
    },
    {
      id: 'open-ai',
      title: 'Ask Artha AI Assistant',
      subtitle: 'Financial insights, roasts, or natural language logging',
      category: 'Actions',
      icon: Bot,
      action: () => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('open-ai-chat'));
      },
    },
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'Balances, statistics, and live activity',
      category: 'Navigation',
      icon: Home,
      action: () => {
        setIsOpen(false);
        navigate('/');
      },
    },
    {
      id: 'nav-transactions',
      title: 'Transactions Ledger',
      subtitle: 'Filter, search, and export transaction history',
      category: 'Navigation',
      icon: ArrowUpDown,
      action: () => {
        setIsOpen(false);
        navigate('/transactions');
      },
    },
    {
      id: 'nav-budgets',
      title: 'Monthly Budgets',
      subtitle: 'Manage category spending limits',
      category: 'Navigation',
      icon: PieChart,
      action: () => {
        setIsOpen(false);
        navigate('/budgets');
      },
    },
    {
      id: 'nav-reports',
      title: 'Financial Reports',
      subtitle: 'Cashflow analytics and category breakdown',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        setIsOpen(false);
        navigate('/reports');
      },
    },
    {
      id: 'nav-accounts',
      title: 'Accounts & Wallets',
      subtitle: 'Banks, UPI wallets, cash, and credit cards',
      category: 'Navigation',
      icon: Wallet,
      action: () => {
        setIsOpen(false);
        navigate('/accounts');
      },
    },
    {
      id: 'nav-goals',
      title: 'Savings Goals',
      subtitle: 'Track milestones and deadline targets',
      category: 'Navigation',
      icon: Target,
      action: () => {
        setIsOpen(false);
        navigate('/savings-goals');
      },
    },
    {
      id: 'nav-recurring',
      title: 'Recurring Payments',
      subtitle: 'Bills and active subscription schedules',
      category: 'Navigation',
      icon: Repeat,
      action: () => {
        setIsOpen(false);
        navigate('/recurring-payments');
      },
    },
    {
      id: 'nav-settings',
      title: 'Settings & Cloud Sync',
      subtitle: 'Currency, themes, Gemini key, and backups',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        setIsOpen(false);
        navigate('/settings');
      },
    },
    {
      id: 'toggle-theme',
      title: settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle theme preference',
      category: 'Preferences',
      icon: settings.theme === 'dark' ? Sun : Moon,
      action: () => {
        setIsOpen(false);
        updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
      },
    },
  ], [navigate, openQuickAdd, settings.theme, updateSettings]);

  const filteredCommands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search size={18} className="text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or jump to page... (e.g., 'Log', 'Reports')"
            className="w-full h-13 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium outline-none border-none shadow-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs sm:text-sm font-semibold truncate">
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>↵ to select</span>
            <span>•</span>
            <span>ESC to close</span>
          </div>
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles size={11} /> MyMoney Intelligence
          </span>
        </div>
      </div>
    </div>
  );
}

