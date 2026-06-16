import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-px bg-neutral-800 p-px">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[#141414] p-4">
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
