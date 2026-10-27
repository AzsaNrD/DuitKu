import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
  ProgressListSkeleton,
  SummaryCardsSkeleton,
} from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <SummaryCardsSkeleton />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* jatah jajan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center md:gap-10">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-6 w-28" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* alokasi */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              <ProgressListSkeleton rows={1} />
              <ProgressListSkeleton rows={1} />
              <ProgressListSkeleton rows={1} />
            </div>
          </CardContent>
        </Card>

        {/* dompet */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* pie chart */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <Skeleton className="h-44 w-44 rounded-full" />
          </CardContent>
        </Card>

        {/* impian */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent className="grid gap-x-8 sm:grid-cols-2">
            <ProgressListSkeleton rows={2} />
            <ProgressListSkeleton rows={2} />
          </CardContent>
        </Card>

        {/* transaksi terbaru */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ListRowsSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
