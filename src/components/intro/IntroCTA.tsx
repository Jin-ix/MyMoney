import { ArrowRight, ShieldCheck, WifiOff } from 'lucide-react';

interface IntroCTAProps {
  onStart: () => void;
}

export function IntroCTA({ onStart }: IntroCTAProps) {
  return (
    <section aria-labelledby="intro-cta-heading" className="relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="intro-rise relative overflow-hidden rounded-[2rem] bg-[#091522] border border-white/[0.09] px-6 py-14 sm:px-12 lg:px-16 lg:py-20 text-center">
          {/* Inner glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full bg-emerald-500/[0.14] blur-[100px] pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-24 right-[10%] w-[300px] h-[200px] rounded-full bg-cyan-400/[0.08] blur-[90px] pointer-events-none" aria-hidden="true" />
          <div className="intro-grid-texture absolute inset-0 opacity-60" aria-hidden="true" />

          <div className="relative">
            <h2
              id="intro-cta-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] text-white leading-tight"
            >
              Take Control of <span className="intro-gradient-text">Your Money</span>
            </h2>
            <p className="mt-4 text-[15px] sm:text-base text-[#A6B3C3] max-w-md mx-auto">
              Start building better financial habits today.
            </p>

            <button
              type="button"
              onClick={onStart}
              className="group mt-8 inline-flex items-center justify-center gap-2.5 min-h-[56px] px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.985] text-[#04120c] font-extrabold text-base intro-emerald-glow transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            >
              Get Started
              <ArrowRight size={20} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-1.5" />
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-medium text-[#718096]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                Private by design
              </span>
              <span className="inline-flex items-center gap-1.5">
                <WifiOff size={13} className="text-cyan-300" />
                Works offline, syncs later
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
