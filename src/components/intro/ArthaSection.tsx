import { Sparkles, Send } from 'lucide-react';
import { ArthaLogo } from '@/components/chat/ArthaLogo';

export function ArthaSection() {
  return (
    <section aria-labelledby="artha-heading" className="relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Copy */}
          <div className="lg:col-span-5 text-center lg:text-left">
            <div className="intro-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full intro-glass mb-5">
              <Sparkles size={12} className="text-amber-300" />
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#A6B3C3]">
                Artha AI Assistant
              </span>
            </div>
            <h2
              id="artha-heading"
              className="intro-rise text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] text-white leading-[1.12]"
              style={{ animationDelay: '80ms' }}
            >
              Meet <span className="intro-gradient-text">Artha AI</span>.
              <span className="block text-white mt-1">A smarter way to understand your money.</span>
            </h2>
            <p
              className="intro-rise mt-5 text-[15px] text-[#A6B3C3] leading-relaxed max-w-md mx-auto lg:mx-0"
              style={{ animationDelay: '160ms' }}
            >
              Ask questions about your spending, budgets, and financial habits. Turn financial
              information into actionable understanding — insights, not guesses.
            </p>
            <ul
              className="intro-rise mt-6 space-y-2.5 text-left max-w-md mx-auto lg:mx-0"
              style={{ animationDelay: '240ms' }}
            >
              {[
                'Ask anything about your transactions and budgets',
                'Plain-language answers powered by your own data',
                'Insights to inform decisions — you stay in control',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-[#A6B3C3]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Chat preview */}
          <div className="lg:col-span-7">
            <div
              className="intro-rise relative max-w-md mx-auto lg:max-w-none lg:ml-auto"
              style={{ animationDelay: '200ms' }}
            >
              <div
                className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(34,211,238,0.12),rgba(16,185,129,0.08),transparent)] blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative rounded-3xl bg-[#0B1522]/95 border border-white/10 backdrop-blur-xl shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)] overflow-hidden">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] bg-gradient-to-r from-teal-500/[0.08] to-emerald-500/[0.08]">
                  <div className="relative">
                    <ArthaLogo size={34} className="drop-shadow-[0_4px_12px_rgba(45,212,191,0.45)]" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1522]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-white">Artha AI</p>
                    <p className="text-[10.5px] text-[#A6B3C3]">Your financial assistant</p>
                  </div>
                  <Sparkles size={15} className="text-amber-300/80" />
                </div>

                {/* Messages */}
                <div className="p-5 space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-emerald-500/15 border border-emerald-400/20 px-4 py-2.5 text-[13px] text-white">
                      How much did I spend on food this month?
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ArthaLogo size={22} className="shrink-0 mt-0.5" />
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.05] border border-white/10 px-4 py-2.5">
                      <p className="text-[13px] text-[#A6B3C3] leading-relaxed">
                        Your food spending is{' '}
                        <span className="font-extrabold text-emerald-300">₹4,250</span> this
                        month. You're currently within your allocated food budget — about{' '}
                        <span className="font-bold text-white">₹750</span> left.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-emerald-500/15 border border-emerald-400/20 px-4 py-2.5 text-[13px] text-white">
                      Where can I save the most?
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ArthaLogo size={22} className="shrink-0 mt-0.5" />
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.05] border border-white/10 px-4 py-2.5">
                      <p className="text-[13px] text-[#A6B3C3] leading-relaxed">
                        Dining out is up{' '}
                        <span className="font-extrabold text-rose-300">18%</span> vs last month.
                        Cutting two weekend orders could free up roughly{' '}
                        <span className="font-bold text-emerald-300">₹1,600</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input mock */}
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5">
                    <span className="flex-1 text-[12px] text-[#718096]">Ask about your money…</span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <Send size={12} className="text-[#04120c]" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
