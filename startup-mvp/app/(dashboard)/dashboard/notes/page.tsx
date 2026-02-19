import { Suspense } from "react";
import NoteManager from "./_components/NoteManager";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Notes | Dashboard",
  description: "Manage system notes",
};

export default function NotesPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<NotesSkeleton />}>
        <NoteManager />
      </Suspense>
    </div>
  );
}

function NotesSkeleton() {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
