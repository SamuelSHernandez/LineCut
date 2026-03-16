import { SkeletonLine, SkeletonCard } from "@/components/shared/Skeleton";

export default function EarningsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SkeletonLine width="200px" height="32px" />
        <SkeletonLine width="120px" height="20px" />
        <SkeletonLine width="160px" height="20px" />
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
