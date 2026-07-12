import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withSubtitle={false} />

      {/* filter */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* list */}
      <Card>
        <CardContent className="p-0">
          <ListRowsSkeleton rows={8} />
        </CardContent>
      </Card>
    </div>
  );
}
