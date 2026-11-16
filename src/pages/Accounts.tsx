import { useState, useMemo } from 'react';
import {
  Plus,
  Wallet,
  Trash2,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  ShieldAlert,
  Edit2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { calculateNetWorth } from '@/lib/finance/netWorth';
import type { Account } from '@/types';

const ACCOUNT_TYPES: Array<{ value: Account['type']; label: string; icon: string }> = [
  { value: 'checking', label: 'Checking / Bank Account', icon: 'Building2' },
  { value: 'savings', label: 'High-Yield Savings', icon: 'PiggyBank' },
  { value: 'credit', label: 'Credit Card (Liability)', icon: 'CreditCard' },
  { value: 'cash', label: 'Physical Cash Wallet', icon: 'Banknote' },
  { value: 'investment', label: 'Brokerage / Investment', icon: 'TrendingUp' },
];

const ACCOUNT_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#475569', // Slate
];

export default function Accounts() {
  const accounts = useStore((s) => s.accounts);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const transferBetweenAccounts = useStore((s) => s.transferBetweenAccounts);
  const repayCreditCard = useStore((s) => s.repayCreditCard);
  const showToast = useStore((s) => s.showToast);
  const settings = useStore((s) => s.settings);
  const symbol = settings.currencySymbol;

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [error, setError] = useState('');

  // Inter-account transfer modal state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');

  // Filter accounts view
  const [filterType, setFilterType] = useState<'all' | 'assets' | 'liabilities'>('all');

  // Strict Wealth Accounting via Finance Engine
  const { totalAssets, totalLiabilities, netWorth, liquidBalance } = useMemo(
    () => calculateNetWorth(accounts),
    [accounts]
  );

  const assets = useMemo(
    () => accounts.filter((a) => a.type !== 'credit'),
    [accounts]
  );
  const liabilities = useMemo(
    () => accounts.filter((a) => a.type === 'credit'),
    [accounts]
  );

  const displayedAccounts = useMemo(() => {
    if (filterType === 'assets') return assets;
    if (filterType === 'liabilities') return liabilities;
    return accounts;
  }, [filterType, assets, liabilities, accounts]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('checking');
    setBalance('');
    setColor(ACCOUNT_COLORS[0]);
    setError('');
    setIsOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(String(acc.balance));
    setColor(acc.color);
    setError('');
    setIsOpen(true);
  };

  const openTransfer = (fromAccountId?: string) => {
    if (accounts.length < 2) {
      showToast('You need at least 2 accounts to make a transfer');
      return;
    }
    const defaultFrom = fromAccountId || accounts[0]?.id || '';
    const defaultTo = accounts.find((a) => a.id !== defaultFrom)?.id || '';
    setTransferFrom(defaultFrom);
    setTransferTo(defaultTo);
    setTransferAmount('');
    setTransferError('');
    setIsTransferOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }
    const parsedBalance = parseFloat(balance || '0');
    const icon = ACCOUNT_TYPES.find((t) => t.value === type)?.icon ?? 'Wallet';

    const payload = {
      name: name.trim(),
      type,
      balance: isNaN(parsedBalance) ? 0 : parsedBalance,
      currency: settings.currency,
      color,
      icon,
    };

    if (editing) {
      updateAccount(editing.id, payload);
      showToast(`Updated ${name.trim()}`);
    } else {
      addAccount(payload);
      showToast(`Created ${name.trim()}`);
    }
    setIsOpen(false);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a transfer amount greater than 0');
      return;
    }
    if (!transferFrom || !transferTo || transferFrom === transferTo) {
      setTransferError('Source and destination accounts must be different');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === transferFrom);
    const destAcc = accounts.find((a) => a.id === transferTo);
    if (!sourceAcc || !destAcc) return;

    if (destAcc.type === 'credit') {
      // Balanced credit card repayment
      repayCreditCard({
        checkingAccountId: sourceAcc.id,
        creditCardAccountId: destAcc.id,
        amount: amt,
      });
      showToast(`Repaid ${formatCurrency(amt, symbol)} toward ${destAcc.name}`);
    } else {
      // Balanced inter-account transfer
      transferBetweenAccounts({
        sourceAccountId: sourceAcc.id,
        destinationAccountId: destAcc.id,
        amount: amt,
      });
      showToast(`Transferred ${formatCurrency(amt, symbol)} from ${sourceAcc.name} to ${destAcc.name}`);
    }

    setIsTransferOpen(false);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Accounts & Portfolios
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Liquid balances, depository assets, and revolving credit liabilities
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {accounts.length >= 2 && (
            <button
              type="button"
              onClick={() => openTransfer()}
              className="min-h-[42px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-200 inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowRightLeft size={16} />
              <span>Transfer Funds</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAdd}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Hero Net Worth Banner */}
      {accounts.length > 0 && (
        <div className="hero-balance-card p-6 sm:p-7 relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                Total Net Worth
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-tabular mt-1">
                {netWorth < 0 ? '-' : ''}
                {formatCurrency(Math.abs(netWorth), symbol)}
              </p>
              <p className="text-xs text-emerald-100/80 mt-1">
                Calculated strictly as Total Assets minus Revolving Credit Liabilities
              </p>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="px-3 py-1">
                <span className="text-[11px] font-medium text-emerald-100 block">Total Assets</span>
                <span className="text-sm sm:text-base font-bold text-white font-tabular block mt-0.5">
                  {formatCurrency(totalAssets, symbol)}
                </span>
              </div>
              <div className="px-3 py-1 border-x border-white/15">
                <span className="text-[11px] font-medium text-rose-200 block">Liabilities</span>
                <span className="text-sm sm:text-base font-bold text-rose-200 font-tabular block mt-0.5">
                  {totalLiabilities > 0 ? `-${formatCurrency(totalLiabilities, symbol)}` : '0'}
                </span>
              </div>
              <div className="px-3 py-1">
                <span className="text-[11px] font-medium text-emerald-100 block">Liquid Cash</span>
                <span className="text-sm sm:text-base font-bold text-white font-tabular block mt-0.5">
                  {formatCurrency(liquidBalance, symbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
          {[
            { id: 'all', label: `All Accounts (${accounts.length})` },
            { id: 'assets', label: `Assets (${assets.length})` },
            { id: 'liabilities', label: `Liabilities (${liabilities.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`min-h-[34px] px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Cards Grid */}
      {displayedAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedAccounts.map((acc) => {
            const isCredit = acc.type === 'credit';
            const isNegative = acc.balance < 0;

            return (
              <div
                key={acc.id}
                className="fintech-card fintech-card-interactive p-5 flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: acc.color }}
                      >
                        <CategoryIcon name={acc.icon} size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {acc.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                            isCredit
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isCredit && <ShieldAlert size={11} />}
                          {acc.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEdit(acc)}
                      aria-label={`Edit ${acc.name}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>

                  <div className="my-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      {isCredit ? 'Outstanding Balance' : 'Current Balance'}
                    </span>
                    <p
                      className={`text-2xl font-bold font-tabular mt-0.5 ${
                        isCredit
                          ? 'text-rose-600 dark:text-rose-400'
                          : isNegative
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {isCredit ? '-' : isNegative ? '-' : ''}
                      {formatCurrency(Math.abs(acc.balance), symbol)}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    Currency: {acc.currency || settings.currency}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {accounts.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => openTransfer(acc.id)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                      >
                        Transfer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(acc)}
                      className="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Manage
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
            <Wallet size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No accounts in this category
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Add bank checking, savings, liquid cash wallets, or credit cards to see real-time net worth intelligence.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add New Account</span>
          </button>
        </div>
      )}

      {/* Add / Edit Account Bottom Sheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Edit Financial Account' : 'Connect New Account'}
      >
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          <div>
            <label
              htmlFor="acc-name"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Account Nickname
            </label>
            <input
              id="acc-name"
              type="text"
              placeholder="e.g. HDFC Salary, Chase Sapphire, Physical Cash"
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
                htmlFor="acc-type"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Account Classification
              </label>
              <Select
                id="acc-type"
                value={type}
                onChange={(val) => setType(val as Account['type'])}
                options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            <div>
              <label
                htmlFor="acc-balance"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Current Balance ({symbol})
              </label>
              <input
                id="acc-balance"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value.replace(/[^0-9.-]/g, ''))}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-tabular font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Color Theme
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {ACCOUNT_COLORS.map((c) => (
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
                  deleteAccount(editing.id);
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
              {editing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Transfer Funds Modal */}
      <BottomSheet
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Inter-Account Transfer"
      >
        <form onSubmit={handleTransfer} className="space-y-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="transfer-from"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                From Account
              </label>
              <Select
                id="transfer-from"
                value={transferFrom}
                onChange={setTransferFrom}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${formatCurrency(a.balance, symbol)})`,
                }))}
              />
            </div>

            <div>
              <label
                htmlFor="transfer-to"
                className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                To Account
              </label>
              <Select
                id="transfer-to"
                value={transferTo}
                onChange={setTransferTo}
                options={accounts
                  .filter((a) => a.id !== transferFrom)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.name} (${formatCurrency(a.balance, symbol)})`,
                  }))}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="transfer-amt"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Transfer Amount ({symbol})
            </label>
            <input
              id="transfer-amt"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={transferAmount}
              onChange={(e) => {
                setTransferAmount(e.target.value.replace(/[^0-9.]/g, ''));
                if (transferError) setTransferError('');
              }}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {transferError && (
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">
              {transferError}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowRightLeft size={18} />
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
