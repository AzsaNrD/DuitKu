import { Card, CardContent } from "@/components/ui/card";
import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons";

export default function RecurringLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          <ListRowsSkeleton rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}
