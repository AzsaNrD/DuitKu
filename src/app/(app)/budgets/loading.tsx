import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeaderSkeleton,
  ProgressListSkeleton,
} from "@/components/skeletons";

export default function BudgetsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="py-2">
          <ProgressListSkeleton rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}
