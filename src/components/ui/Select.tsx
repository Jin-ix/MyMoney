import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface SelectProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  id,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 text-sm font-semibold transition-all outline-none cursor-pointer ${
          open
            ? 'border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/90 text-gray-900 dark:text-white'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate text-gray-900 dark:text-white font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="custom-select-menu absolute z-50 mt-1.5 w-full min-w-[180px] max-h-60 overflow-y-auto rounded-2xl border border-gray-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/20 p-1.5 animate-dropdown-in"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

