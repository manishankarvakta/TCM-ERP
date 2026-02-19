import { Suspense } from "react";
import DocManager from "./_components/DocManager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Docs | Dashboard",
  description: "Internal documentation and wiki",
};

export default function DocsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<DocsSkeleton />}>
        <DocManager />
      </Suspense>
    </div>
  );
}

function DocsSkeleton() {
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
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
