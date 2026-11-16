import { useState, useEffect, useRef } from 'react';
import { Check, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Select } from '@/components/ui/Select';
import { useStore } from '@/store/useStore';
import { getCategoriesByType, PAYMENT_METHODS } from '@/lib/categories';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export default function QuickAddTransaction() {
  const isOpen = useStore((s) => s.quickAddOpen);
  const defaultType = useStore((s) => s.quickAddDefaultType);
  const quickAddDate = useStore((s) => s.quickAddDate);
  const editingTransaction = useStore((s) => s.editingTransaction);
  const closeQuickAdd = useStore((s) => s.closeQuickAdd);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const showToast = useStore((s) => s.showToast);
  const accounts = useStore((s) => s.accounts);
  const currencySymbol = useStore((s) => s.settings.currencySymbol);

  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const categories = getCategoriesByType(type);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setType(editingTransaction.type === 'income' ? 'income' : 'expense');
        setAmount(String(editingTransaction.amount));
        setCategory(editingTransaction.category);
        setPaymentMethod(editingTransaction.paymentMethod);
        setAccountId(editingTransaction.accountId);
        setDate(editingTransaction.date);
        setRemarks(editingTransaction.description);
      } else {
        setType(defaultType);
        const cats = getCategoriesByType(defaultType);
        setCategory(cats[0]?.id ?? '');
        setAmount('');
        setRemarks('');
        setPaymentMethod('upi');
        setDate(quickAddDate ?? format(new Date(), 'yyyy-MM-dd'));
        if (accounts.length > 0 && !accountId) {
          setAccountId(accounts[0].id);
        }
      }
      setError('');
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editingTransaction, defaultType, quickAddDate, accounts, accountId]);

  const handleTypeChange = (nextType: 'expense' | 'income') => {
    setType(nextType);
    const nextCategories = getCategoriesByType(nextType);
    setCategory(nextCategories[0]?.id ?? '');
  };

  const handleQuickAddAmount = (delta: number) => {
    const current = parseFloat(amount || '0') || 0;
    setAmount(String(current + delta));
    if (error) setError('');
  };

  const resetForm = () => {
    setAmount('');
    setRemarks('');
    setPaymentMethod('upi');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than 0');
      amountInputRef.current?.focus();
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }

    const catName = categories.find((c) => c.id === category)?.name || 'Transaction';
    const payload = {
      type,
      amount: parsedAmount,
      category,
      description: remarks.trim() || catName,
      date,
      paymentMethod,
      accountId: accountId || accounts[0]?.id || '',
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
      showToast('Transaction updated');
    } else {
      addTransaction(payload);
      showToast(
        `${type === 'expense' ? 'Expense' : 'Income'} of ${currencySymbol}${parsedAmount} saved`
      );
    }
    resetForm();
    closeQuickAdd();
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={closeQuickAdd}
        title={
          editingTransaction
            ? 'Edit Transaction'
            : type === 'expense'
            ? 'Log Expense'
            : 'Add Income'
        }
        fullScreen
      >
        <form onSubmit={handleSubmit} className="space-y-5 pb-4">
          {/* Income / Expense Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-slate-800/90 rounded-2xl border border-gray-200/50 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Income
            </button>
          </div>

          {/* Large Amount Input + Quick Chips */}
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-slate-800/90 dark:to-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all shadow-sm">
            <label htmlFor="tx-amount" className="block text-xs font-bold text-gray-500 dark:text-slate-400 text-center uppercase tracking-wider mb-1.5">
              {type === 'expense' ? 'Amount Spent' : 'Amount Received'}
            </label>
            <div className="flex items-center justify-center gap-1.5 py-1">
              <span className="text-3xl font-extrabold text-gray-400 dark:text-slate-400">{currencySymbol}</span>
              <input
                ref={amountInputRef}
                id="tx-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(val);
                  if (error) setError('');
                }}
                className="w-48 text-center text-4xl font-black tabular-nums text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-xs font-bold text-gray-700 dark:text-slate-200 transition-colors min-h-[34px] cursor-pointer shadow-xs"
                >
                  +{currencySymbol}{val}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold" role="alert">
              {error}
            </p>
          )}

          {/* Category Grid */}
          <div>
            <span className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Category
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {categories.map((cat) => {
                const selected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-center transition-all min-h-[72px] active:scale-95 cursor-pointer ${
                      selected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/40 shadow-xs font-bold'
                        : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 font-medium'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={16} />
                    </span>
                    <span className="text-xs font-semibold leading-tight text-center truncate max-w-full">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks (Optional) */}
          <div>
            <label htmlFor="tx-remarks" className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <MessageSquareText size={13} />
              <span>Remarks (Optional)</span>
            </label>
            <input
              id="tx-remarks"
              type="text"
              placeholder="e.g., Lunch with friends, Uber to office..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full min-h-[46px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 transition-all"
            />
          </div>

          {/* Payment Method Chips */}
          <div>
            <span className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Payment Method
            </span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {PAYMENT_METHODS.map((pm) => {
                const selected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all min-h-[44px] shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-gray-900 dark:bg-emerald-600 text-white border-gray-900 dark:border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CategoryIcon name={pm.icon} size={14} />
                    <span>{pm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.length > 0 && (
              <div>
                <label htmlFor="tx-account" className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Account
                </label>
                <Select
                  id="tx-account"
                  value={accountId || accounts[0]?.id}
                  onChange={setAccountId}
                  options={accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${acc.type})`,
                    color: acc.color,
                  }))}
                />
              </div>
            )}

            <div className={accounts.length === 0 ? 'sm:col-span-2' : ''}>
              <label htmlFor="tx-date" className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className={`w-full min-h-[50px] rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
              type === 'expense'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-600/25'
            }`}
          >
            <Check size={20} strokeWidth={2.5} />
            <span>
              {editingTransaction
                ? 'Save Changes'
                : type === 'expense'
                ? 'Save Expense'
                : 'Save Income'}
            </span>
          </button>
        </form>
      </BottomSheet>
    </>
  );
}
