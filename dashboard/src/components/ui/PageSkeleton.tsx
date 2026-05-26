'use client';

import { cn } from '@/lib/utils';

export function SkeletonBar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{
        background: 'var(--bg-hover)',
        ...style,
      }}
      aria-hidden
    />
  );
}

export function GRRPageSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5" style={{ background: 'var(--bg-root)' }}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-6 w-48" />
          <SkeletonBar className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonBar className="h-9 w-28" />
          <SkeletonBar className="h-9 w-28" />
        </div>
      </div>
      <SkeletonBar className="h-52 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SkeletonBar className="h-80 lg:col-span-2 rounded-xl" />
        <SkeletonBar className="h-80 lg:col-span-3 rounded-xl" />
      </div>
    </div>
  );
}

export function AlertsPageSkeleton() {
  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-root)' }}>
      <div className="px-6 py-5 border-b space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <SkeletonBar className="h-6 w-36" />
        <SkeletonBar className="h-4 w-56" />
        <div className="flex gap-4">
          <SkeletonBar className="h-4 w-20" />
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-4 w-28" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-full lg:w-[420px] border-r p-4 space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBar key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <SkeletonBar className="hidden lg:block flex-1 m-4 rounded-xl" />
      </div>
    </div>
  );
}

export function InlineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-5 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
