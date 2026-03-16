import { SkeletonCircle, SkeletonLine } from "@/components/shared/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <SkeletonCircle size={64} />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="160px" height="24px" />
          <SkeletonLine width="120px" height="14px" />
        </div>
      </div>
      <div className="space-y-4">
        <SkeletonLine width="100%" height="44px" />
        <SkeletonLine width="100%" height="44px" />
        <SkeletonLine width="100%" height="44px" />
        <SkeletonLine width="100%" height="44px" />
        <SkeletonLine width="100%" height="44px" />
      </div>
    </div>
  );
}
