import { Suspense } from "react";
import TaskManager from "@/app/(dashboard)/dashboard/tasks/_components/TaskManager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "My Tasks | Dashboard",
  description: "Manage your personal tasks",
};

export default function MyTasksPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<TasksSkeleton />}>
        <TaskManager />
      </Suspense>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
