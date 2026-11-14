import { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

const WEEKLY_SPENDING = [
  { day: 'Mon', thisWeek: 1240, lastWeek: 1680 },
  { day: 'Tue', thisWeek: 640, lastWeek: 920 },
  { day: 'Wed', thisWeek: 2100, lastWeek: 1740 },
  { day: 'Thu', thisWeek: 880, lastWeek: 1310 },
  { day: 'Fri', thisWeek: 3120, lastWeek: 3560 },
  { day: 'Sat', thisWeek: 4260, lastWeek: 4980 },
  { day: 'Sun', thisWeek: 2210, lastWeek: 2870 },
];

export function SpendingChartPreview({ compact = false }: { compact?: boolean }) {
  const gradientId = useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#718096]">
          Weekly Spending
        </span>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-[#A6B3C3]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            This week
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400/70" />
            Last week
          </span>
        </div>
      </div>
      <div className={compact ? 'h-24' : 'h-32'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={WEEKLY_SPENDING} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#718096', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#718096', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
              width={34}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(52,211,153,0.3)' }}
              contentStyle={{
                background: '#0b1522',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                fontSize: 11,
              }}
              labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === 'thisWeek' ? 'This week' : 'Last week',
              ]}
            />
            <ReferenceLine y={2500} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="lastWeek"
              stroke="#22d3ee"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              fill="none"
              isAnimationActive
              animationDuration={900}
            />
            <Area
              type="monotone"
              dataKey="thisWeek"
              stroke="#34d399"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
