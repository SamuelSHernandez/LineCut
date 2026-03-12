import { SkeletonLine, SkeletonCard } from "@/components/shared/Skeleton";

export default function SellerLoading() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div>
        <SkeletonLine width="200px" height="32px" />
        <div className="mt-2">
          <SkeletonLine width="250px" height="15px" />
        </div>
      </div>

      {/* GoLivePanel skeleton */}
      <div className="bg-ticket rounded-[10px] p-6 border-2 border-mustard shadow-[0_4px_20px_rgba(0,0,0,0.06)] space-y-4">
        <SkeletonLine width="120px" height="22px" />
        <SkeletonLine width="300px" height="13px" />
        <SkeletonLine width="100%" height="48px" />
        <SkeletonLine width="100%" height="48px" />
        <SkeletonLine width="100%" height="48px" />
      </div>

      {/* Orders skeleton */}
      <div>
        <SkeletonLine width="180px" height="22px" />
        <div className="mt-3 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
