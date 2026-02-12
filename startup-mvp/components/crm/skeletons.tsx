import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <Skeleton className="h-6 w-full max-w-[200px]" />
            <Skeleton className="h-6 w-full max-w-[200px]" />
            <Skeleton className="h-6 w-full max-w-[100px]" />
            <Skeleton className="h-6 w-full max-w-[100px]" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0 flex gap-4 items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-3 w-[200px]" />
            </div>
            <Skeleton className="h-8 w-[100px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-[300px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[30px] rounded-full" />
          </div>
          <div className="flex-1 bg-muted/10 rounded-lg p-2 space-y-3">
             {[...Array(3)].map((_, j) => (
               <div key={j} className="bg-background p-4 rounded-md border shadow-sm space-y-3">
                 <Skeleton className="h-5 w-3/4" />
                 <div className="flex justify-between">
                   <Skeleton className="h-3 w-1/3" />
                   <Skeleton className="h-3 w-1/4" />
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                   <Skeleton className="h-6 w-6 rounded-full" />
                   <Skeleton className="h-3 w-1/2" />
                 </div>
               </div>
             ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[300px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-[100px]" />
                    <Skeleton className="h-9 w-[100px]" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                    <Skeleton className="h-[400px] w-full rounded-lg" />
                </div>
                <div className="space-y-6">
                     <Skeleton className="h-[300px] w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
