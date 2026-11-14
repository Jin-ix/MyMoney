import { CircleDollarSign } from 'lucide-react';

export function IntroNavbar() {
  return (
    <header className="absolute top-0 inset-x-0 z-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 h-16 lg:h-20 flex items-center">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-md" aria-hidden="true" />
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-1 ring-white/20">
              <CircleDollarSign size={17} strokeWidth={2.4} className="text-white" />
            </div>
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight text-white">MyMoney</p>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-slate-400 uppercase">
              Personal Finance
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
