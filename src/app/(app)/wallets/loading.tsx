import {
  CardGridSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons";

export default function WalletsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </div>
  );
}
