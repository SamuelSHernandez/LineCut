import { SkeletonLine, SkeletonCard } from "@/components/shared/Skeleton";

export default function DisputesLoading() {
  return (
    <div className="space-y-8">
      <SkeletonLine width="160px" height="32px" />
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
