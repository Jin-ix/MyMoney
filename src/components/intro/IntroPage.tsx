import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { IntroBackground } from './IntroBackground';
import { IntroNavbar } from './IntroNavbar';
import { IntroHero } from './IntroHero';
import { DashboardPreview } from './DashboardPreview';
import { FeatureGrid } from './FeatureGrid';
import { ArthaSection } from './ArthaSection';
import { IntroCTA } from './IntroCTA';
import './intro.css';

export function IntroPage() {
  const completeIntro = useStore((s) => s.completeIntro);
  const [exiting, setExiting] = useState(false);

  const handleStart = () => {
    setExiting(true);
    setTimeout(() => {
      completeIntro();
    }, 300);
  };

  return (
    <div
      className={`intro-root fixed inset-0 z-50 overflow-y-auto transition-all duration-300 ${
        exiting ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
    >
      <IntroBackground />
      <IntroNavbar />

      <main className="relative z-10">
        {/* Hero + dashboard showcase */}
        <section
          aria-label="MyMoney introduction"
          className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <IntroHero onStart={handleStart} />
            <div className="lg:col-span-6 intro-rise" style={{ animationDelay: '300ms' }}>
              <DashboardPreview />
            </div>
          </div>
        </section>

        <div className="pb-4 lg:pb-8">
          <FeatureGrid />
        </div>

        <div className="py-16 lg:py-24">
          <ArthaSection />
        </div>

        <div className="pb-16 lg:pb-24">
          <IntroCTA onStart={handleStart} />
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-6 flex items-center justify-between text-[11px] text-[#718096]">
          <span className="font-semibold">MyMoney — Personal Finance Platform</span>
          <span>Demo visuals are illustrative only</span>
        </div>
      </footer>
    </div>
  );
}
