export function IntroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep midnight base gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050A13_0%,#071120_45%,#050A13_100%)]" />

      {/* Emerald glow behind hero */}
      <div className="intro-drift absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-emerald-500/[0.13] blur-[130px]" />

      {/* Secondary cyan glow behind dashboard area */}
      <div className="intro-drift absolute top-[38%] -right-40 w-[560px] h-[560px] rounded-full bg-cyan-400/[0.09] blur-[140px] [animation-delay:-9s]" />

      {/* Soft secondary emerald wash lower-left */}
      <div className="intro-drift absolute bottom-[-10%] -left-40 w-[520px] h-[520px] rounded-full bg-emerald-600/[0.08] blur-[140px] [animation-delay:-14s]" />

      {/* Fine grid texture */}
      <div className="intro-grid-texture absolute inset-0" />

      {/* Faint geometric accents */}
      <div className="absolute top-[16%] left-[6%] w-40 h-40 rounded-full border border-white/[0.05] hidden lg:block" />
      <div className="absolute top-[24%] left-[9%] w-24 h-24 rounded-full border border-emerald-400/[0.08] hidden lg:block" />
      <div className="absolute bottom-[18%] right-[7%] w-52 h-52 rounded-3xl border border-white/[0.05] rotate-12 hidden lg:block" />
    </div>
  );
}
