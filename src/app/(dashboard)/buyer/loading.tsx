import { SkeletonLine, SkeletonRestaurantCard } from "@/components/shared/Skeleton";

export default function BuyerLoading() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div>
        <SkeletonLine width="200px" height="32px" />
        <div className="mt-2">
          <SkeletonLine width="140px" height="24px" />
        </div>
      </div>

      {/* Restaurant browser skeleton */}
      <div>
        <SkeletonLine width="220px" height="22px" />
        <div className="mt-4">
          <SkeletonLine width="100%" height="44px" />
        </div>
        <div className="mt-3 flex gap-2">
          <SkeletonLine width="70px" height="36px" />
          <SkeletonLine width="90px" height="36px" />
          <SkeletonLine width="60px" height="36px" />
        </div>
        <div className="mt-6 space-y-4">
          <SkeletonRestaurantCard />
          <SkeletonRestaurantCard />
          <SkeletonRestaurantCard />
        </div>
      </div>
    </div>
  );
}
