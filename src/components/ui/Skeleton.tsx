interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="fintech-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 fintech-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="fintech-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
