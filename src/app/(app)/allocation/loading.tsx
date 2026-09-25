import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  ProgressListSkeleton,
} from "@/components/skeletons";

export default function AllocationLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-2">
          <ProgressListSkeleton rows={3} />
        </CardContent>
      </Card>
    </div>
  );
}
