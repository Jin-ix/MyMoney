import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Smartphone,
  CircleDollarSign,
  CloudOff,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface IntroHeroProps {
  onStart: () => void;
}

const TRUST_ITEMS = [
  { icon: Zap, label: 'Effortless daily tracking' },
  { icon: ShieldCheck, label: 'Private financial data' },
  { icon: Smartphone, label: 'Works across devices' },
];

export function IntroHero({ onStart }: IntroHeroProps) {
  const isOnline = useOnlineStatus();

  return (
    <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left w-full">
        {/* Brand mark + product label (compact on mobile to eliminate duplication with navbar) */}
        <div className="intro-rise flex flex-col items-center lg:items-start gap-2.5 sm:gap-4" style={{ animationDelay: '60ms' }}>
          <div className="hidden sm:flex relative w-16 h-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-emerald-400/30" style={{ animation: 'intro-pulse-ring 3.2s ease-out infinite' }} aria-hidden="true" />
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl" aria-hidden="true" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 flex items-center justify-center shadow-xl shadow-emerald-500/40 ring-1 ring-white/25">
              <CircleDollarSign size={26} strokeWidth={2.3} className="text-white" />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-tight text-white">MyMoney</span>
            <span className="h-3 w-px bg-white/20" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[0.24em] text-emerald-300/90 uppercase">
              Personal Finance Platform
            </span>
          </div>

          {/* Readiness indicator — reflects real connectivity */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full intro-glass text-[11px] font-semibold text-slate-300 mt-2 sm:mt-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isOnline ? 'Online · syncs automatically' : 'Offline-ready · changes saved locally'}
            <CloudOff size={11} className={isOnline ? 'hidden' : 'text-amber-300/80'} />
          </span>
        </div>

        {/* Headline */}
        <div className="intro-rise mt-4 sm:mt-7 space-y-1" style={{ animationDelay: '160ms' }}>
          <h1 className="text-3xl leading-[1.08] sm:text-5xl lg:text-[4.2rem] font-extrabold tracking-[-0.03em]">
            <span className="block text-white">Your Money.</span>
            <span className="block">
              Your <span className="intro-gradient-text">Clarity.</span>
            </span>
            <span className="block">
              Your <span className="intro-gradient-text">Control.</span>
            </span>
          </h1>
          <p className="mt-3 sm:mt-5 text-sm sm:text-base lg:text-lg text-[#A6B3C3] max-w-md leading-relaxed mx-auto lg:mx-0">
            Take control of your finances with effortless expense tracking, intelligent budgets,
            and insights that help you make every rupee count.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="intro-rise mt-4 sm:mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2" style={{ animationDelay: '260ms' }}>
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#A6B3C3]">
              <Icon size={14} className="text-emerald-400" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="intro-rise mt-6 sm:mt-9 w-full max-w-md" style={{ animationDelay: '360ms' }}>
          <button
            type="button"
            onClick={onStart}
            className="group relative w-full min-h-[50px] sm:min-h-[54px] px-6 sm:px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.985] text-[#04120c] font-extrabold text-sm sm:text-base intro-emerald-glow transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 cursor-pointer"
          >
            <span className="inline-flex items-center justify-center gap-2">
              Take Control of Your Money
              <ArrowRight size={18} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-1.5" />
            </span>
          </button>
          <p className="mt-2.5 sm:mt-3.5 text-center lg:text-left text-xs sm:text-[13px] text-[#718096]">
            Start building better financial habits today.
          </p>
        </div>
    </div>
  );
}
