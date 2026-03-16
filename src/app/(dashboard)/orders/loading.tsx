import { SkeletonLine, SkeletonCard } from "@/components/shared/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-8">
      <SkeletonLine width="180px" height="32px" />
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
