import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullScreen?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  fullScreen = false,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal */}
      <div
        className={`relative z-10 w-full bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slide-up lg:animate-fade-in ${
          fullScreen
            ? 'h-[95dvh] rounded-t-3xl lg:h-auto lg:max-h-[88vh] lg:max-w-xl lg:rounded-3xl'
            : 'max-h-[90dvh] rounded-t-3xl lg:h-auto lg:max-h-[88vh] lg:max-w-xl lg:rounded-3xl'
        }`}
        style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {title || ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
