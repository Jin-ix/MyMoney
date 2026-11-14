interface FloatingMetricCardProps {
  title: string;
  value: string;
  hint?: string;
  tone?: 'emerald' | 'cyan' | 'neutral';
  className?: string;
  delayClass?: string;
}

const TONES = {
  emerald: 'text-emerald-300',
  cyan: 'text-cyan-300',
  neutral: 'text-white',
} as const;

export function FloatingMetricCard({
  title,
  value,
  hint,
  tone = 'emerald',
  className = '',
  delayClass = '',
}: FloatingMetricCardProps) {
  return (
    <div
      className={`intro-float absolute z-20 intro-glass rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl ${className} ${delayClass}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#718096]">{title}</p>
      <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] font-medium text-[#A6B3C3]">{hint}</p>}
    </div>
  );
}
