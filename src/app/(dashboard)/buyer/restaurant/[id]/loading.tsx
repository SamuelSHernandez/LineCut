import { SkeletonLine, SkeletonCard } from "@/components/shared/Skeleton";

export default function RestaurantDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Back link skeleton */}
      <SkeletonLine width="180px" height="16px" />

      {/* Restaurant header skeleton */}
      <div className="bg-ticket rounded-[10px] border border-card-border shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="w-full h-48 bg-sidewalk/15 animate-pulse motion-reduce:animate-none" />
        <div className="p-5 space-y-3">
          <SkeletonLine width="60%" height="32px" />
          <SkeletonLine width="80%" height="13px" />
          <div className="flex gap-2">
            <SkeletonLine width="60px" height="24px" />
            <SkeletonLine width="80px" height="24px" />
          </div>
          <div className="border-t border-dashed border-divider my-3" />
          <div className="flex items-center gap-4">
            <SkeletonLine width="80px" height="24px" />
            <SkeletonLine width="60px" height="12px" />
            <SkeletonLine width="80px" height="12px" />
          </div>
        </div>
      </div>

      {/* Sellers skeleton */}
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
