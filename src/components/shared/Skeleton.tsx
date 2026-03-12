export function SkeletonLine({ width = "100%", height = "14px" }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded-[6px] bg-sidewalk/15 animate-pulse motion-reduce:animate-none"
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-sidewalk/15 animate-pulse motion-reduce:animate-none flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-ticket rounded-[10px] border border-card-border p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonCircle size={36} />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="60%" height="16px" />
          <SkeletonLine width="40%" height="12px" />
        </div>
      </div>
      <div className="border-t border-dashed border-divider my-3" />
      <div className="flex items-center justify-between">
        <SkeletonLine width="80px" height="24px" />
        <SkeletonLine width="60px" height="12px" />
      </div>
    </div>
  );
}

export function SkeletonRestaurantCard() {
  return (
    <div className="bg-ticket rounded-[10px] border border-card-border shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="w-full h-2 bg-sidewalk/15 animate-pulse motion-reduce:animate-none" />
      <div className="p-5 space-y-3">
        <SkeletonLine width="70%" height="18px" />
        <SkeletonLine width="90%" height="13px" />
        <div className="flex gap-2">
          <SkeletonLine width="60px" height="24px" />
          <SkeletonLine width="80px" height="24px" />
        </div>
        <div className="border-t border-dashed border-divider my-3" />
        <div className="flex items-center justify-between">
          <SkeletonLine width="80px" height="24px" />
          <SkeletonLine width="60px" height="12px" />
        </div>
      </div>
    </div>
  );
}
